import * as wa from '../services/whatsappService.js';
import pool from '../config/db.js';

// Cria tabela de logs se não existir
pool.query(`CREATE TABLE IF NOT EXISTS log_envio_whatsapp (
    id SERIAL PRIMARY KEY,
    idorganizacao TEXT,
    idservico TEXT,
    jid TEXT,
    nomecontato TEXT,
    mensagem TEXT,
    status TEXT DEFAULT 'pendente',
    erro TEXT,
    createdat TIMESTAMPTZ DEFAULT NOW()
)`).catch(console.error);

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

export const enviarLote = async (req, res) => {
    const { contatos, mensagem, idServico, idOrganizacao } = req.body;
    if (!contatos?.length || !mensagem) return res.status(400).json({ error: 'contatos e mensagem são obrigatórios.' });

    // Insere uma linha "pendente" imediatamente para cada contato
    const itemsComLog = await Promise.all(contatos.map(async (c) => {
        try {
            const r = await pool.query(
                `INSERT INTO log_envio_whatsapp (idorganizacao, idservico, jid, nomecontato, mensagem, status)
                 VALUES ($1,$2,$3,$4,$5,'pendente') RETURNING id`,
                [idOrganizacao, idServico || null, c.jid, c.nome, mensagem]
            );
            return { ...c, logId: r.rows[0].id };
        } catch { return { ...c, logId: null }; }
    }));

    const items = itemsComLog.map(c => ({
        jid: c.jid,
        texto: mensagem,
        onSuccess: async () => {
            if (!c.logId) return;
            await pool.query(`UPDATE log_envio_whatsapp SET status='enviado' WHERE id=$1`, [c.logId]);
        },
        onError: async (erro) => {
            if (!c.logId) return;
            await pool.query(`UPDATE log_envio_whatsapp SET status='erro', erro=$2 WHERE id=$1`, [c.logId, erro]);
        }
    }));

    try {
        const result = await wa.enfileirarLote(items);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getLogs = async (req, res) => {
    const { idOrganizacao } = req.query;
    if (!idOrganizacao) return res.status(400).json({ error: 'idOrganizacao é obrigatório.' });
    try {
        const result = await pool.query(
            `SELECT * FROM log_envio_whatsapp WHERE idorganizacao = $1 ORDER BY createdat DESC LIMIT 200`,
            [idOrganizacao]
        );
        res.json(result.rows);
    } catch (e) {
        if (e.code === '42P01') return res.json([]); // tabela ainda não existe
        res.status(500).json({ error: e.message });
    }
};

export const getFilaStatus = (_req, res) => res.json(wa.getFilaStatus());
