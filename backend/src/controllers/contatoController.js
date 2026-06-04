import pool from '../config/db.js';

export const getContatos = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                c.idcontato,
                c.nomecontato,
                c.telefonecontato,
                c.emailcontato,
                c.idorganizacao,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'idmoto', m.idmoto,
                            'nomemoto', m.nomemoto,
                            'descricaomoto', m.descricaomoto
                        )
                    ) FILTER (WHERE m.idmoto IS NOT NULL),
                    '[]'
                ) AS motos
            FROM contato c
            LEFT JOIN contato_moto cm ON c.idcontato = cm.idcontato
            LEFT JOIN moto m ON cm.idmoto = m.idmoto
            WHERE c.idorganizacao = $1
            GROUP BY c.idcontato
            ORDER BY c.nomecontato ASC`,
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarContato = async (req, res) => {
    const { nomeContato, telefoneContato, emailContato, idOrganizacao } = req.body;

    if (!nomeContato || !idOrganizacao) {
        return res.status(400).json({ error: 'Nome do contato e idOrganizacao são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO contato (nomecontato, telefonecontato, emailcontato, idorganizacao)
             VALUES ($1, $2, $3, $4)
             RETURNING idcontato, nomecontato, telefonecontato, emailcontato, idorganizacao`,
            [nomeContato, telefoneContato ?? null, emailContato ?? null, idOrganizacao]
        );

        return res.status(201).json({
            message: 'Contato cadastrado com sucesso.',
            contato: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarContato = async (req, res) => {
    const { idContato } = req.params;
    const { nomeContato, telefoneContato, emailContato } = req.body;

    if (!nomeContato) {
        return res.status(400).json({ error: 'Nome do contato é obrigatório.' });
    }

    try {
        const result = await pool.query(
            `UPDATE contato
             SET nomecontato = $1, telefonecontato = $2, emailcontato = $3
             WHERE idcontato = $4
             RETURNING idcontato, nomecontato, telefonecontato, emailcontato, idorganizacao`,
            [nomeContato, telefoneContato ?? null, emailContato ?? null, idContato]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado.' });
        }

        return res.status(200).json({
            message: 'Contato atualizado com sucesso.',
            contato: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarContato = async (req, res) => {
    const { idContato } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM contato WHERE idcontato = $1 RETURNING idcontato',
            [idContato]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado.' });
        }

        return res.status(200).json({ message: 'Contato deletado com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const vincularMoto = async (req, res) => {
    const { idContato, idMoto } = req.params;

    try {
        await pool.query(
            'INSERT INTO contato_moto (idcontato, idmoto) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [idContato, idMoto]
        );

        return res.status(201).json({ message: 'Moto vinculada ao contato com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const desvincularMoto = async (req, res) => {
    const { idContato, idMoto } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM contato_moto WHERE idcontato = $1 AND idmoto = $2 RETURNING idcontato',
            [idContato, idMoto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vínculo não encontrado.' });
        }

        return res.status(200).json({ message: 'Moto desvinculada do contato com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
