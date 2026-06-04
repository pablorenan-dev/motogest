import pool from '../config/db.js';

export const getVendas = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                v.idvenda,
                v.idorganizacao,
                v.idservico,
                v.datavenda,
                v.valortotal,
                v.observacoes,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'iditemvenda', iv.iditemvenda,
                            'idproduto', iv.idproduto,
                            'nomeproduto', p.nomeproduto,
                            'quantidade', iv.quantidade,
                            'precounitario', iv.precounitario
                        )
                    ) FILTER (WHERE iv.iditemvenda IS NOT NULL),
                    '[]'
                ) AS itens
            FROM venda v
            LEFT JOIN itemvenda iv ON v.idvenda = iv.idvenda
            LEFT JOIN produto p ON iv.idproduto = p.idproduto
            WHERE v.idorganizacao = $1
            GROUP BY v.idvenda
            ORDER BY v.datavenda DESC`,
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarVenda = async (req, res) => {
    const { idOrganizacao, idServico, observacoes, itens } = req.body;

    if (!idOrganizacao || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'idOrganizacao e itens são obrigatórios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Valida estoque antes de qualquer alteração
        for (const item of itens) {
            const estoque = await client.query(
                'SELECT quantidadeproduto, nomeproduto FROM produto WHERE idproduto = $1',
                [item.idProduto]
            );

            if (estoque.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: `Produto ${item.idProduto} não encontrado.` });
            }

            if (estoque.rows[0].quantidadeproduto < item.quantidade) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Estoque insuficiente para "${estoque.rows[0].nomeproduto}". Disponível: ${estoque.rows[0].quantidadeproduto}, solicitado: ${item.quantidade}.`
                });
            }
        }

        // Cria a venda
        const vendaResult = await client.query(
            'INSERT INTO venda (idorganizacao, idservico, observacoes) VALUES ($1, $2, $3) RETURNING idvenda',
            [idOrganizacao, idServico ?? null, observacoes ?? null]
        );
        const idVenda = vendaResult.rows[0].idvenda;

        // Insere os itens, subtrai estoque e acumula total
        let valorTotal = 0;

        for (const item of itens) {
            await client.query(
                'INSERT INTO itemvenda (idvenda, idproduto, quantidade, precounitario) VALUES ($1, $2, $3, $4)',
                [idVenda, item.idProduto, item.quantidade, item.precoUnitario]
            );

            await client.query(
                'UPDATE produto SET quantidadeproduto = quantidadeproduto - $1 WHERE idproduto = $2',
                [item.quantidade, item.idProduto]
            );

            valorTotal += item.quantidade * item.precoUnitario;
        }

        // Salva o total calculado
        await client.query(
            'UPDATE venda SET valortotal = $1 WHERE idvenda = $2',
            [valorTotal, idVenda]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Venda registrada com sucesso.',
            idvenda: idVenda,
            valortotal: valorTotal
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

export const deletarVenda = async (req, res) => {
    const { idVenda } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM venda WHERE idvenda = $1 RETURNING idvenda',
            [idVenda]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada.' });
        }

        return res.status(200).json({ message: 'Venda deletada com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
