import pool from '../config/db.js';

export const getUsuarios = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'SELECT idusuario, nomeusuario, emailusuario, idorganizacao FROM usuario WHERE idorganizacao = $1 ORDER BY nomeusuario ASC',
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarUsuario = async (req, res) => {
    const { nomeUsuario, emailUsuario, senhaUsuario, idOrganizacao } = req.body;

    if (!nomeUsuario || !emailUsuario || !senhaUsuario || !idOrganizacao) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        const emailExiste = await pool.query(
            'SELECT 1 FROM usuario WHERE emailusuario = $1',
            [emailUsuario]
        );

        if (emailExiste.rows.length > 0) {
            return res.status(409).json({ error: 'Email já cadastrado.' });
        }

        const result = await pool.query(
            `INSERT INTO usuario (nomeusuario, emailusuario, senhausuario, idorganizacao)
             VALUES ($1, $2, $3, $4)
             RETURNING idusuario, nomeusuario, emailusuario, idorganizacao`,
            [nomeUsuario, emailUsuario, senhaUsuario, idOrganizacao]
        );

        return res.status(201).json({
            message: 'Usuário cadastrado com sucesso.',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarUsuario = async (req, res) => {
    const { idUsuario } = req.params;
    const { nomeUsuario, emailUsuario, senhaUsuario } = req.body;

    if (!nomeUsuario || !emailUsuario) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    try {
        const emailExiste = await pool.query(
            'SELECT 1 FROM usuario WHERE emailusuario = $1 AND idusuario != $2',
            [emailUsuario, idUsuario]
        );

        if (emailExiste.rows.length > 0) {
            return res.status(409).json({ error: 'Email já está em uso por outro usuário.' });
        }

        const campos = ['nomeusuario = $1', 'emailusuario = $2'];
        const valores = [nomeUsuario, emailUsuario];

        if (senhaUsuario) {
            campos.push(`senhausuario = $${valores.length + 1}`);
            valores.push(senhaUsuario);
        }

        valores.push(idUsuario);

        const result = await pool.query(
            `UPDATE usuario SET ${campos.join(', ')} WHERE idusuario = $${valores.length} RETURNING idusuario, nomeusuario, emailusuario, idorganizacao`,
            valores
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.status(200).json({
            message: 'Usuário atualizado com sucesso.',
            usuario: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarUsuario = async (req, res) => {
    const { idUsuario } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM usuario WHERE idusuario = $1 RETURNING idusuario',
            [idUsuario]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        return res.status(200).json({ message: 'Usuário deletado com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
