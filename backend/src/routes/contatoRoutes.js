import express from 'express';
import { getContatos, criarContato, editarContato, deletarContato, vincularMoto, desvincularMoto } from '../controllers/contatoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getContatos);
router.post('/', criarContato);
router.put('/:idContato', editarContato);
router.delete('/:idContato', deletarContato);
router.post('/:idContato/motos/:idMoto', vincularMoto);
router.delete('/:idContato/motos/:idMoto', desvincularMoto);

export default router;
