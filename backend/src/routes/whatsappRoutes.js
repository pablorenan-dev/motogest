import express from 'express';
import { sse, status, chats, mensagens, enviar, enviarLote, getLogs, getFilaStatus, conectar, desconectar, getConfiguracao, setConfiguracao, iniciarConversa, baixarMedia } from '../controllers/whatsappController.js';

const router = express.Router();

// SSE não suporta Authorization header — aceita token via query param
router.get('/sse',              sse);

router.get('/status',           status);
router.get('/chats',            chats);
router.get('/mensagens/:jid',   mensagens);
router.post('/enviar',          enviar);
router.post('/enviar-lote',     enviarLote);
router.get('/logs',             getLogs);
router.get('/fila-status',      getFilaStatus);
router.post('/iniciar',         iniciarConversa);
router.post('/conectar',        conectar);
router.post('/desconectar',     desconectar);
router.get('/media/:jid/:msgId', baixarMedia);
router.get('/configuracao',     getConfiguracao);
router.post('/configuracao',    setConfiguracao);

export default router;
