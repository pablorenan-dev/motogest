import express from 'express';
import { getProdutos, postProduto, editarProduto, deletarProduto } from '../controllers/produtoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getProdutos);
router.post('/', postProduto);
router.put('/:idproduto', editarProduto);
router.delete('/:idproduto', deletarProduto);

export default router;