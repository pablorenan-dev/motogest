import express from 'express';
import { getCompras, criarCompra, deletarCompra } from '../controllers/compraController.js';

const router = express.Router();

router.get('/:idOrganizacao', getCompras);
router.post('/', criarCompra);
router.delete('/:idCompra', deletarCompra);

export default router;
