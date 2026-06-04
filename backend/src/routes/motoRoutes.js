import express from 'express';
import { getMotos, criarMoto, editarMoto, deletarMoto } from '../controllers/motoController.js';

const router = express.Router();

router.get('/:idOrganizacao', getMotos);
router.post('/', criarMoto);
router.put('/:idMoto', editarMoto);
router.delete('/:idMoto', deletarMoto);

export default router;
