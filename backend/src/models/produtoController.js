import pool from '../models/db.js';

export const getProdutos = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM produto WHERE "idOrganizacao" = $1 ORDER BY "nomeProduto" ASC',
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};