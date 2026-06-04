import express from 'express';
import { getUsuarios, criarUsuario, editarUsuario, deletarUsuario } from '../controllers/usuarioController.js';

const router = express.Router();

router.get('/:idOrganizacao', getUsuarios);
router.post('/', criarUsuario);
router.put('/:idUsuario', editarUsuario);
router.delete('/:idUsuario', deletarUsuario);

export default router;
