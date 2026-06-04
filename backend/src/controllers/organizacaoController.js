import pool from '../config/db.js';

export const getOrganizacao = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'SELECT idorganizacao, nomeorganizacao FROM organizacao WHERE idorganizacao = $1',
            [idOrganizacao]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organização não encontrada.' });
        }

        return res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarOrganizacao = async (req, res) => {
    const { nomeOrganizacao } = req.body;

    if (!nomeOrganizacao) {
        return res.status(400).json({ error: 'Nome da organização é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO organizacao (nomeorganizacao) VALUES ($1) RETURNING idorganizacao, nomeorganizacao',
            [nomeOrganizacao]
        );

        return res.status(201).json({
            message: 'Organização criada com sucesso.',
            organizacao: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarOrganizacao = async (req, res) => {
    const { idOrganizacao } = req.params;
    const { nomeOrganizacao } = req.body;

    if (!nomeOrganizacao) {
        return res.status(400).json({ error: 'Nome da organização é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE organizacao SET nomeorganizacao = $1 WHERE idorganizacao = $2 RETURNING idorganizacao, nomeorganizacao',
            [nomeOrganizacao, idOrganizacao]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organização não encontrada.' });
        }

        return res.status(200).json({
            message: 'Organização atualizada com sucesso.',
            organizacao: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarOrganizacao = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM organizacao WHERE idorganizacao = $1 RETURNING idorganizacao',
            [idOrganizacao]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organização não encontrada.' });
        }

        return res.status(200).json({ message: 'Organização deletada com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
