import express from 'express';
import { getProdutos } from '../controllers/produtoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getProdutos);

export default router;