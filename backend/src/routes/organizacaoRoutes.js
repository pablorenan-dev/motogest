import express from 'express';
import { getOrganizacao, criarOrganizacao, editarOrganizacao, deletarOrganizacao } from '../controllers/organizacaoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getOrganizacao);
router.post('/', criarOrganizacao);
router.put('/:idOrganizacao', editarOrganizacao);
router.delete('/:idOrganizacao', deletarOrganizacao);

export default router;
