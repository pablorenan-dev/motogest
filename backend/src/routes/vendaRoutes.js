import express from 'express';
import { getVendas, criarVenda, deletarVenda } from '../controllers/vendaController.js';

const router = express.Router();

router.get('/:idOrganizacao', getVendas);
router.post('/', criarVenda);
router.delete('/:idVenda', deletarVenda);

export default router;
