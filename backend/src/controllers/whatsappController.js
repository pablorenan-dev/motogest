import * as wa from '../services/whatsappService.js';

export const sse = (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    wa.addSSE(res);
    // Heartbeat a cada 25s para manter a conexão viva
    const hb = setInterval(() => { try { res.write(':ping\n\n'); } catch { clearInterval(hb); } }, 25000);
    res.on('close', () => clearInterval(hb));
};

export const status      = (_req, res) => res.json(wa.getStatus());
export const chats       = (_req, res) => res.json(wa.getChats());

export const mensagens   = (req, res) => {
    const { jid } = req.params;
    const limit   = parseInt(req.query.limit) || 50;
    res.json(wa.getMsgs(decodeURIComponent(jid), limit));
};

export const enviar = async (req, res) => {
    const { jid, texto } = req.body;
    if (!jid || !texto) return res.status(400).json({ error: 'jid e texto são obrigatórios.' });
    try {
        const msg = await wa.enviar(jid, texto);
        res.json({ ok: true, mensagem: msg });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const baixarMedia = async (req, res) => {
    const { jid, msgId } = req.params;
    try {
        const { buffer, mime, filename } = await wa.baixarMedia(decodeURIComponent(jid), msgId);
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
};

export const iniciarConversa = async (req, res) => {
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ error: 'telefone é obrigatório.' });
    try {
        const resultado = await wa.iniciarConversa(telefone);
        res.json({ ok: true, ...resultado });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const getConfiguracao = (_req, res) => res.json(wa.getConfig());

export const setConfiguracao = (req, res) => {
    const { somenteMensagensNovas } = req.body;
    if (typeof somenteMensagensNovas !== 'boolean')
        return res.status(400).json({ error: 'somenteMensagensNovas deve ser boolean.' });
    wa.setConfig({ somenteMensagensNovas });
    res.json({ ok: true, config: wa.getConfig() });
};

export const conectar = async (_req, res) => {
    try {
        await wa.conectar();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const desconectar = async (_req, res) => {
    await wa.desconectar();
    res.json({ ok: true });
};
