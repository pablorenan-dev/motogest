import pool from '../config/db.js';

export const getServicos = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                s.idservico,
                s.nomeservico,
                s.descricaoservico,
                s.statusservico,
                s.prioridade,
                s.dataentrada,
                s.dataconclusao,
                s.valorservico,
                s.observacoes,
                s.idorganizacao,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'idmoto', m.idmoto,
                        'nomemoto', m.nomemoto,
                        'descricaomoto', m.descricaomoto
                    ))
                    FROM servico_moto sm
                    JOIN moto m ON sm.idmoto = m.idmoto
                    WHERE sm.idservico = s.idservico
                ), '[]') AS motos,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'idcontato', c.idcontato,
                        'nomecontato', c.nomecontato,
                        'telefonecontato', c.telefonecontato,
                        'emailcontato', c.emailcontato
                    ))
                    FROM servico_contato sc
                    JOIN contato c ON sc.idcontato = c.idcontato
                    WHERE sc.idservico = s.idservico
                ), '[]') AS contatos
            FROM servico s
            WHERE s.idorganizacao = $1
            ORDER BY s.dataentrada DESC`,
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarServico = async (req, res) => {
    const { nomeServico, descricaoServico, statusServico, prioridade, dataEntrada, dataConclusao, valorServico, observacoes, idOrganizacao } = req.body;

    if (!nomeServico || !idOrganizacao) {
        return res.status(400).json({ error: 'nomeServico e idOrganizacao são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO servico (nomeservico, descricaoservico, statusservico, prioridade, dataentrada, dataconclusao, valorservico, observacoes, idorganizacao)
             VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9)
             RETURNING *`,
            [
                nomeServico,
                descricaoServico ?? null,
                statusServico ?? 'aguardando',
                prioridade ?? 'normal',
                dataEntrada ?? null,
                dataConclusao ?? null,
                valorServico ?? 0,
                observacoes ?? null,
                idOrganizacao
            ]
        );

        return res.status(201).json({
            message: 'Serviço criado com sucesso.',
            servico: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const editarServico = async (req, res) => {
    const { idServico } = req.params;
    const { nomeServico, descricaoServico, statusServico, prioridade, dataEntrada, dataConclusao, valorServico, observacoes } = req.body;

    if (!nomeServico) {
        return res.status(400).json({ error: 'nomeServico é obrigatório.' });
    }

    try {
        const result = await pool.query(
            `UPDATE servico
             SET nomeservico = $1, descricaoservico = $2, statusservico = $3, prioridade = $4,
                 dataentrada = COALESCE($5, dataentrada), dataconclusao = $6, valorservico = $7, observacoes = $8
             WHERE idservico = $9
             RETURNING *`,
            [nomeServico, descricaoServico ?? null, statusServico, prioridade, dataEntrada ?? null, dataConclusao ?? null, valorServico ?? 0, observacoes ?? null, idServico]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }

        return res.status(200).json({
            message: 'Serviço atualizado com sucesso.',
            servico: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarServico = async (req, res) => {
    const { idServico } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM servico WHERE idservico = $1 RETURNING idservico',
            [idServico]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }

        return res.status(200).json({ message: 'Serviço deletado com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const vincularMoto = async (req, res) => {
    const { idServico, idMoto } = req.params;

    try {
        await pool.query(
            'INSERT INTO servico_moto (idservico, idmoto) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [idServico, idMoto]
        );

        return res.status(201).json({ message: 'Moto vinculada ao serviço com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const desvincularMoto = async (req, res) => {
    const { idServico, idMoto } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM servico_moto WHERE idservico = $1 AND idmoto = $2 RETURNING idservico',
            [idServico, idMoto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vínculo não encontrado.' });
        }

        return res.status(200).json({ message: 'Moto desvinculada do serviço com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const vincularContato = async (req, res) => {
    const { idServico, idContato } = req.params;

    try {
        await pool.query(
            'INSERT INTO servico_contato (idservico, idcontato) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [idServico, idContato]
        );

        return res.status(201).json({ message: 'Contato vinculado ao serviço com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const desvincularContato = async (req, res) => {
    const { idServico, idContato } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM servico_contato WHERE idservico = $1 AND idcontato = $2 RETURNING idservico',
            [idServico, idContato]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vínculo não encontrado.' });
        }

        return res.status(200).json({ message: 'Contato desvinculado do serviço com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
