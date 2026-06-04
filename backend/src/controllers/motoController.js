import pool from '../config/db.js';

export const getMotos = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'SELECT idmoto, nomemoto, descricaomoto, idorganizacao FROM moto WHERE idorganizacao = $1 ORDER BY nomemoto ASC',
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarMoto = async (req, res) => {
    const { nomeMoto, descricaoMoto, idOrganizacao } = req.body;

    if (!nomeMoto || !idOrganizacao) {
        return res.status(400).json({ error: 'Nome da moto e idOrganizacao são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO moto (nomemoto, descricaomoto, idorganizacao) VALUES ($1, $2, $3) RETURNING idmoto, nomemoto, descricaomoto, idorganizacao',
            [nomeMoto, descricaoMoto ?? null, idOrganizacao]
        );

        return res.status(201).json({
            message: 'Moto cadastrada com sucesso.',
            moto: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarMoto = async (req, res) => {
    const { idMoto } = req.params;
    const { nomeMoto, descricaoMoto } = req.body;

    if (!nomeMoto) {
        return res.status(400).json({ error: 'Nome da moto é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE moto SET nomemoto = $1, descricaomoto = $2 WHERE idmoto = $3 RETURNING idmoto, nomemoto, descricaomoto, idorganizacao',
            [nomeMoto, descricaoMoto ?? null, idMoto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Moto não encontrada.' });
        }

        return res.status(200).json({
            message: 'Moto atualizada com sucesso.',
            moto: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarMoto = async (req, res) => {
    const { idMoto } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM moto WHERE idmoto = $1 RETURNING idmoto',
            [idMoto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Moto não encontrada.' });
        }

        return res.status(200).json({ message: 'Moto deletada com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
