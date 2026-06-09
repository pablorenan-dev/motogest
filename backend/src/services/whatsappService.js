import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage,
    jidNormalizedUser,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino  from 'pino';
import { fileURLToPath } from 'url';
import path from 'path';
import fs   from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const AUTH_DIR   = path.join(__dirname, '../../../.whatsapp-auth');

const logger = pino({ level: 'silent' });

let sock     = null;
let qrBase64 = null;
let status   = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'

const config = { somenteMensagensNovas: false };

const chatMap    = new Map(); // jid → chatInfo  (keyed by phone JID)
const msgMap     = new Map(); // jid → RawMessage[] (keyed by phone JID)
const contactMap = new Map(); // jid → nome do contato
const lidToJid   = new Map(); // lid@lid → phone@s.whatsapp.net
const sseSet     = new Set(); // response objects

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

export const getMsgs = (jid, limit = 50) => {
    const key = canonJid(jid);
    return (msgMap.get(key) || msgMap.get(jid) || [])
        .sort((a, b) => Number(a.messageTimestamp || 0) - Number(b.messageTimestamp || 0))
        .slice(-limit)
        .map(serializar);
};

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
                // Primeiro atualiza o status (esconde o spinner), depois envia o QR
                broadcast('status', { status: 'qr' });
                broadcast('qr',     { qr: qrBase64 });
            }

            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                sock = null; qrBase64 = null; status = 'disconnected';
                broadcast('status', { status });

                const sessaoInvalida = code === DisconnectReason.loggedOut
                                    || code === DisconnectReason.badSession;

                if (sessaoInvalida) {
                    // Apaga credenciais antigas para forçar novo QR na próxima tentativa
                    try { await fs.rm(AUTH_DIR, { recursive: true, force: true }); } catch {}
                    console.log('[WA] Sessão inválida — credenciais removidas. Conecte novamente.');
                } else {
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

        // ── Chats: carga inicial completa ────────────────────────────────────
        sock.ev.on('chats.set', ({ chats = [] }) => {
            chats.forEach(c => {
                if (!c.id) return;
                const jid = canonJid(c.id);
                chatMap.set(jid, {
                    jid,
                    nome:     resolveNome(jid, null) || c.name || formatJid(jid),
                    naoLidas: c.unreadCount || 0,
                    ts:       Number(c.conversationTimestamp || 0),
                    lastMsg:  null,
                });
            });
            broadcast('chats', getChats());
        });

        // ── Chats: novas conversas ou atualizações de nome/contagem ──────────
        sock.ev.on('chats.upsert', (newChats) => {
            newChats.forEach(c => {
                if (!c.id) return;
                const jid      = canonJid(c.id);
                const existing = chatMap.get(jid);
                chatMap.set(jid, {
                    jid,
                    nome:     resolveNome(jid, null) || c.name || existing?.nome || formatJid(jid),
                    naoLidas: c.unreadCount ?? existing?.naoLidas ?? 0,
                    ts:       Number(c.conversationTimestamp || existing?.ts || 0),
                    lastMsg:  existing?.lastMsg || null,
                });
            });
            broadcast('chats', getChats());
        });

        // ── Histórico de mensagens (sync inicial) ────────────────────────────
        sock.ev.on('messaging-history.set', ({ chats, messages }) => {
            // Popula chatMap com chats do histórico (sempre — mesmo com toggle ativo)
            if (chats?.length) {
                chats.forEach(c => {
                    if (!c.id) return;
                    if (!chatMap.has(c.id)) {
                        chatMap.set(c.id, {
                            jid:      c.id,
                            nome:     c.name || formatJid(c.id),
                            naoLidas: c.unreadCount || 0,
                            ts:       Number(c.conversationTimestamp || 0),
                            lastMsg:  null,
                        });
                    }
                });
            }

            // Mensagens históricas: ignora conteúdo se "somente mensagens novas"
            if (!config.somenteMensagensNovas) {
                for (const m of (messages || [])) {
                    const rawJid = m.key?.remoteJid;
                    if (!rawJid) continue;
                    const jid = canonJid(rawJid);

                    const arr = msgMap.get(jid) || [];
                    if (!arr.find(x => x.key?.id === m.key?.id)) arr.push(m);
                    msgMap.set(jid, arr);

                    const existing = chatMap.get(jid) || { jid, nome: resolveNome(jid, m.pushName) || formatJid(jid), naoLidas: 0, ts: 0 };
                    const ts = Number(m.messageTimestamp || 0);
                    if (ts >= existing.ts) {
                        chatMap.set(jid, { ...existing, ts, lastMsg: serializar(m) });
                    }
                }
            }

            broadcast('chats', getChats());
        });

        sock.ev.on('chats.update', (updates) => {
            updates.forEach(u => {
                const jid      = canonJid(u.id);
                const existing = chatMap.get(jid);
                if (existing) {
                    chatMap.set(jid, {
                        ...existing,
                        naoLidas: u.unreadCount ?? existing.naoLidas,
                        ts:       Number(u.conversationTimestamp || existing.ts),
                    });
                }
            });
            broadcast('chats', getChats());
        });

        // ── Contatos: atualiza nomes e mapeamento LID↔phone ─────────────────
        sock.ev.on('contacts.upsert', (contacts) => {
            contacts.forEach(c => {
                if (!c.id) return;
                const phoneJid = canonJid(c.id);
                const nome = c.name || c.notify || c.verifiedName;

                // Mantém mapeamento LID → phone JID
                if (c.lid && c.lid !== c.id) {
                    lidToJid.set(c.lid, phoneJid);

                    // Migra entrada @lid no chatMap para phone JID
                    const chatLid = chatMap.get(c.lid);
                    if (chatLid && !chatMap.has(phoneJid)) {
                        chatMap.set(phoneJid, { ...chatLid, jid: phoneJid });
                        chatMap.delete(c.lid);
                    }
                    // Migra mensagens @lid → phone JID
                    const msgsLid = msgMap.get(c.lid);
                    if (msgsLid && !msgMap.has(phoneJid)) {
                        msgMap.set(phoneJid, msgsLid);
                        msgMap.delete(c.lid);
                    }
                }

                if (nome) {
                    contactMap.set(phoneJid, nome);
                    const chat = chatMap.get(phoneJid);
                    if (chat) chatMap.set(phoneJid, { ...chat, nome });
                }
            });
            broadcast('chats', getChats());
        });

        // ── Mensagens ────────────────────────────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            for (const m of messages) {
                const rawJid = m.key?.remoteJid;
                if (!rawJid) continue;
                const jid = canonJid(rawJid);

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

                // Atualiza chat — resolve nome: catálogo > pushName > número
                const existing = chatMap.get(jid) || { jid, nome: formatJid(jid), naoLidas: 0, ts: 0 };
                const nomeResolvido = resolveNome(jid, !m.key?.fromMe ? (m.pushName || null) : null);
                chatMap.set(jid, {
                    ...existing,
                    nome:    nomeResolvido || existing.nome,
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
    // Remove credenciais para que a próxima conexão gere novo QR
    try { await fs.rm(AUTH_DIR, { recursive: true, force: true }); } catch {}
    status = 'disconnected'; qrBase64 = null;
    chatMap.clear(); msgMap.clear();
    broadcast('status', { status });
    console.log('[WA] Desconectado — credenciais removidas.');
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

// Desembrulha mensagens efêmeras / visualização única que encapsulam o conteúdo real
function unwrap(msg) {
    return msg?.ephemeralMessage?.message
        || msg?.viewOnceMessage?.message
        || msg?.viewOnceMessageV2?.message?.message
        || msg?.documentWithCaptionMessage?.message
        || msg;
}

function serializar(m) {
    const raw = unwrap(m.message);

    const img  = raw?.imageMessage;
    const aud  = raw?.audioMessage;
    const vid  = raw?.videoMessage;
    const doc  = raw?.documentMessage;
    const stk  = raw?.stickerMessage;
    const loc  = raw?.locationMessage || raw?.liveLocationMessage;
    const ctt  = raw?.contactMessage;
    const ctts = raw?.contactsArrayMessage;
    const poll = raw?.pollCreationMessage || raw?.pollCreationMessageV2 || raw?.pollCreationMessageV3;
    const react = raw?.reactionMessage;
    const proto = raw?.protocolMessage;

    // Mensagens internas (reação, protocolo) não têm texto útil
    if (react || proto) {
        return {
            id: m.key?.id || '', jid: m.key?.remoteJid || '',
            fromMe: !!m.key?.fromMe, pushName: m.pushName || '',
            timestamp: Number(m.messageTimestamp || 0),
            body: null, mediaType: null, mediaBase64: null,
        };
    }

    const body =
        raw?.conversation ||
        raw?.extendedTextMessage?.text ||
        img?.caption ||
        vid?.caption ||
        doc?.caption ||
        (aud  ? (aud.ptt ? '[mensagem de voz]' : '[áudio]')          : null) ||
        (doc  ? `[arquivo: ${doc.fileName || 'documento'}]`           : null) ||
        (stk  ? '[figurinha]'                                         : null) ||
        (loc  ? '[localização]'                                       : null) ||
        (ctt  ? `[contato: ${ctt.displayName || ''}]`                : null) ||
        (ctts ? '[contatos]'                                          : null) ||
        (poll ? `[enquete: ${poll.name || ''}]`                      : null) ||
        (m.message ? '[mídia]' : '');

    const mediaType = img ? 'image' : aud ? 'audio' : vid ? 'video' : null;

    return {
        id:          m.key?.id          || '',
        jid:         m.key?.remoteJid   || '',
        fromMe:      !!m.key?.fromMe,
        pushName:    m.pushName         || '',
        timestamp:   Number(m.messageTimestamp || 0),
        body,
        mediaType,
        mediaBase64: m._mediaBase64     || null,
    };
}

// Resolve LID → phone JID; normaliza sufixo de device (:0, :5 …)
function canonJid(jid) {
    if (!jid) return jid;
    // LID → resolve para phone JID se tivermos o mapeamento
    if (jid.endsWith('@lid')) return lidToJid.get(jid) || jid;
    // Remove sufixo de dispositivo: 5521999@s.whatsapp.net (já normalizado)
    try { return jidNormalizedUser(jid); } catch { return jid; }
}

function resolveNome(jid, pushName) {
    return contactMap.get(jid) || (jid.endsWith('@lid') ? contactMap.get(lidToJid.get(jid) || '') : null) || pushName || null;
}

function formatJid(jid = '') {
    const raw = jid.split('@')[0];
    // LID ou identificador não numérico de privacidade
    if (jid.endsWith('@lid') || !/^\d+$/.test(raw)) return raw.slice(-6);
    // Brasileiro: +55 (DD) XXXXX-XXXX
    if (raw.length === 13 && raw.startsWith('55'))
        return `+55 (${raw.slice(2,4)}) ${raw.slice(4,9)}-${raw.slice(9)}`;
    if (raw.length === 12 && raw.startsWith('55'))
        return `+55 (${raw.slice(2,4)}) ${raw.slice(4,8)}-${raw.slice(8)}`;
    // EUA/Canadá
    if (raw.length === 11 && raw.startsWith('1'))
        return `+1 (${raw.slice(1,4)}) ${raw.slice(4,7)}-${raw.slice(7)}`;
    return `+${raw}`;
}
