import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino  from 'pino';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const AUTH_DIR   = path.join(__dirname, '../../../.whatsapp-auth');

const logger = pino({ level: 'silent' });

let sock     = null;
let qrBase64 = null;
let status   = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'

const config = { somenteMensagensNovas: false };

const chatMap = new Map(); // jid → chatInfo
const msgMap  = new Map(); // jid → RawMessage[]
const sseSet  = new Set(); // response objects

// ── SSE broadcast ─────────────────────────────────────────────────────────────
function broadcast(evt, data) {
    const raw = `event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`;
    sseSet.forEach(res => {
        try { res.write(raw); }
        catch { sseSet.delete(res); }
    });
}

// ── SSE subscription ──────────────────────────────────────────────────────────
export function addSSE(res) {
    sseSet.add(res);
    res.on('close', () => sseSet.delete(res));
    // Estado imediato para o cliente que acabou de conectar
    res.write(`event: status\ndata: ${JSON.stringify({ status, qr: qrBase64 })}\n\n`);
    if (chatMap.size > 0) {
        res.write(`event: chats\ndata: ${JSON.stringify(getChats())}\n\n`);
    }
}

// ── Leitura de estado ─────────────────────────────────────────────────────────
export const getStatus = () => ({ status, qr: qrBase64 });
export const getConfig = () => ({ ...config });
export const setConfig = (opts) => { Object.assign(config, opts); };

export const getChats = () =>
    [...chatMap.values()]
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .slice(0, 100);

export const getMsgs = (jid, limit = 50) =>
    (msgMap.get(jid) || [])
        .sort((a, b) => Number(a.messageTimestamp || 0) - Number(b.messageTimestamp || 0))
        .slice(-limit)
        .map(serializar);

// ── Conexão ───────────────────────────────────────────────────────────────────
export async function conectar() {
    if (sock) return;

    status = 'connecting';
    broadcast('status', { status });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

        sock = makeWASocket({
            auth:                  state,
            printQRInTerminal:     false,
            logger,
            browser:               ['Motogest', 'Chrome', '1.0'],
            syncFullHistory:       false,
            generateHighQualityLinkPreview: false,
        });

        // ── Eventos de conexão ───────────────────────────────────────────────
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrBase64 = await qrcode.toDataURL(qr);
                status   = 'qr';
                broadcast('qr', { qr: qrBase64 });
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                sock = null; qrBase64 = null; status = 'disconnected';
                broadcast('status', { status });
                // Reconecta automaticamente se não foi logout manual
                if (code !== DisconnectReason.loggedOut) {
                    console.log('[WA] Reconectando em 5s...');
                    setTimeout(conectar, 5000);
                }
            }

            if (connection === 'open') {
                qrBase64 = null; status = 'connected';
                broadcast('status', { status });
                console.log('[WA] Conectado!');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // ── Chats ────────────────────────────────────────────────────────────
        sock.ev.on('chats.upsert', (newChats) => {
            // Se "somente mensagens novas", ignora o histórico de conversas
            if (config.somenteMensagensNovas) return;
            newChats.forEach(c => {
                chatMap.set(c.id, {
                    jid:      c.id,
                    nome:     c.name || formatJid(c.id),
                    naoLidas: c.unreadCount || 0,
                    ts:       Number(c.conversationTimestamp || 0),
                    lastMsg:  null,
                });
            });
            broadcast('chats', getChats());
        });

        // ── Histórico de mensagens (sync inicial) ────────────────────────────
        sock.ev.on('messaging-history.set', ({ messages }) => {
            for (const m of messages) {
                const jid = m.key?.remoteJid;
                if (!jid) continue;

                const arr = msgMap.get(jid) || [];
                if (!arr.find(x => x.key?.id === m.key?.id)) arr.push(m);
                msgMap.set(jid, arr);

                // Mantém o chatMap atualizado com o preview da última msg
                const existing = chatMap.get(jid) || { jid, nome: formatJid(jid), naoLidas: 0, ts: 0 };
                const ts = Number(m.messageTimestamp || 0);
                if (ts >= existing.ts) {
                    chatMap.set(jid, { ...existing, ts, lastMsg: serializar(m) });
                }
            }
        });

        sock.ev.on('chats.update', (updates) => {
            updates.forEach(u => {
                const existing = chatMap.get(u.id);
                if (existing) {
                    chatMap.set(u.id, {
                        ...existing,
                        naoLidas: u.unreadCount ?? existing.naoLidas,
                        ts:       Number(u.conversationTimestamp || existing.ts),
                    });
                }
            });
            broadcast('chats', getChats());
        });

        // ── Mensagens ────────────────────────────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            for (const m of messages) {
                const jid = m.key?.remoteJid;
                if (!jid) continue;

                // Baixa mídia (imagem e áudio apenas; vídeo pode ser grande)
                const hasImage = !!m.message?.imageMessage;
                const hasAudio = !!m.message?.audioMessage;
                if (hasImage || hasAudio) {
                    try {
                        const buffer = await downloadMediaMessage(
                            m, 'buffer', {},
                            { logger, reuploadRequest: sock.updateMediaMessage }
                        );
                        const mime = m.message?.imageMessage?.mimetype
                            || m.message?.audioMessage?.mimetype
                            || 'application/octet-stream';
                        m._mediaBase64 = `data:${mime};base64,${buffer.toString('base64')}`;
                    } catch (e) {
                        console.error('[WA] Erro ao baixar mídia:', e.message);
                    }
                }

                // Guarda na memória
                const arr = msgMap.get(jid) || [];
                if (!arr.find(x => x.key?.id === m.key?.id)) arr.push(m);
                if (arr.length > 200) arr.splice(0, arr.length - 200);
                msgMap.set(jid, arr);

                // Atualiza chat
                const existing = chatMap.get(jid) || { jid, nome: formatJid(jid), naoLidas: 0, ts: 0 };
                chatMap.set(jid, {
                    ...existing,
                    ts:      Number(m.messageTimestamp || existing.ts),
                    lastMsg: serializar(m),
                });
            }

            if (type === 'notify') {
                messages.forEach(m => broadcast('mensagem', serializar(m)));
                broadcast('chats', getChats());
            }
        });

    } catch (err) {
        console.error('[WA] Erro ao iniciar:', err.message);
        sock = null; status = 'disconnected';
        broadcast('status', { status });
    }
}

// ── Desconexão ────────────────────────────────────────────────────────────────
export async function desconectar() {
    if (sock) {
        try { await sock.logout(); } catch {}
        sock = null;
    }
    status = 'disconnected'; qrBase64 = null;
    chatMap.clear(); msgMap.clear();
    broadcast('status', { status });
    console.log('[WA] Desconectado.');
}

// ── Envio ─────────────────────────────────────────────────────────────────────
export async function enviar(jid, texto) {
    if (!sock || status !== 'connected') throw new Error('WhatsApp não conectado.');

    const msg = await sock.sendMessage(jid, { text: texto });
    const arr = msgMap.get(jid) || [];
    arr.push(msg); msgMap.set(jid, arr);

    const s = serializar(msg);
    const c = chatMap.get(jid) || { jid, nome: formatJid(jid), naoLidas: 0, ts: 0 };
    chatMap.set(jid, { ...c, ts: s.timestamp, lastMsg: s });
    broadcast('chats', getChats());
    return s;
}

// ── Download de mídia sob demanda ─────────────────────────────────────────────
export async function baixarMedia(jid, msgId) {
    if (!sock) throw new Error('WhatsApp não conectado.');
    const msgs = msgMap.get(jid) || [];
    const m = msgs.find(x => x.key?.id === msgId);
    if (!m) throw new Error('Mensagem não encontrada na memória.');

    const buffer = await downloadMediaMessage(
        m, 'buffer', {},
        { logger, reuploadRequest: sock.updateMediaMessage }
    );

    const vid = m.message?.videoMessage;
    const doc = m.message?.documentMessage;
    const img = m.message?.imageMessage;
    const aud = m.message?.audioMessage;

    const mime     = vid?.mimetype || doc?.mimetype || img?.mimetype || aud?.mimetype || 'application/octet-stream';
    const filename = doc?.fileName || `midia_${msgId}`;
    return { buffer, mime, filename };
}

// ── Nova conversa ─────────────────────────────────────────────────────────────
export async function iniciarConversa(telefone) {
    if (!sock || status !== 'connected') throw new Error('WhatsApp não conectado.');

    const num = telefone.replace(/\D/g, '');
    if (!num) throw new Error('Número inválido.');

    // Verifica se existe no WhatsApp
    const [result] = await sock.onWhatsApp(num);
    if (!result?.exists) throw new Error('Número não encontrado no WhatsApp.');

    const jid = result.jid;
    if (!chatMap.has(jid)) {
        chatMap.set(jid, { jid, nome: formatJid(jid), naoLidas: 0, ts: Math.floor(Date.now() / 1000), lastMsg: null });
        broadcast('chats', getChats());
    }
    return { jid, nome: chatMap.get(jid).nome };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function serializar(m) {
    const img = m.message?.imageMessage;
    const aud = m.message?.audioMessage;
    const vid = m.message?.videoMessage;
    const doc = m.message?.documentMessage;

    const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        img?.caption ||
        vid?.caption ||
        (aud ? (aud.ptt ? '[mensagem de voz]' : '[áudio]') : null) ||
        (doc ? `[arquivo: ${doc.fileName || 'documento'}]` : null) ||
        (m.message ? '[mídia]' : '');

    const mediaType = img ? 'image' : aud ? 'audio' : vid ? 'video' : null;

    return {
        id:          m.key?.id   || '',
        jid:         m.key?.remoteJid || '',
        fromMe:      !!m.key?.fromMe,
        pushName:    m.pushName  || '',
        timestamp:   Number(m.messageTimestamp || 0),
        body,
        mediaType,
        mediaBase64: m._mediaBase64 || null,
    };
}

function formatJid(jid = '') {
    return jid.split('@')[0];
}
