import express from 'express';
import { getServicos, criarServico, editarServico, deletarServico, vincularMoto, desvincularMoto, vincularContato, desvincularContato } from '../controllers/servicoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getServicos);
router.post('/', criarServico);
router.put('/:idServico', editarServico);
router.delete('/:idServico', deletarServico);
router.post('/:idServico/motos/:idMoto', vincularMoto);
router.delete('/:idServico/motos/:idMoto', desvincularMoto);
router.post('/:idServico/contatos/:idContato', vincularContato);
router.delete('/:idServico/contatos/:idContato', desvincularContato);

export default router;
