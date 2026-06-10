import express from 'express';
import { getServicos, getServicoPorId, criarServico, editarServico, deletarServico, vincularMoto, desvincularMoto, vincularContato, desvincularContato, vincularProduto, desvincularProduto } from '../controllers/servicoController.js';

const router = express.Router();

router.get('/detalhe/:idServico', getServicoPorId);
router.get('/:idOrganizacao', getServicos);
router.post('/', criarServico);
router.put('/:idServico', editarServico);
router.delete('/:idServico', deletarServico);
router.post('/:idServico/motos/:idMoto', vincularMoto);
router.delete('/:idServico/motos/:idMoto', desvincularMoto);
router.post('/:idServico/contatos/:idContato', vincularContato);
router.delete('/:idServico/contatos/:idContato', desvincularContato);
router.post('/:idServico/produtos/:idProduto', vincularProduto);
router.delete('/:idServico/produtos/:idProduto', desvincularProduto);

export default router;
