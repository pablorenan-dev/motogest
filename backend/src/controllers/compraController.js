import pool from '../config/db.js';

export const getCompras = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                c.idcompra,
                c.idorganizacao,
                c.nomefornecedor,
                c.datacompra,
                c.valortotal,
                c.observacoes,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'iditemcompra', ic.iditemcompra,
                            'idproduto', ic.idproduto,
                            'nomeproduto', p.nomeproduto,
                            'quantidade', ic.quantidade,
                            'precounitario', ic.precounitario
                        )
                    ) FILTER (WHERE ic.iditemcompra IS NOT NULL),
                    '[]'
                ) AS itens
            FROM compra c
            LEFT JOIN itemcompra ic ON c.idcompra = ic.idcompra
            LEFT JOIN produto p ON ic.idproduto = p.idproduto
            WHERE c.idorganizacao = $1
            GROUP BY c.idcompra
            ORDER BY c.datacompra DESC`,
            [idOrganizacao]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarCompra = async (req, res) => {
    const { idOrganizacao, nomeFornecedor, observacoes, itens } = req.body;

    if (!idOrganizacao || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'idOrganizacao e itens são obrigatórios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Cria a compra
        const compraResult = await client.query(
            'INSERT INTO compra (idorganizacao, nomefornecedor, observacoes) VALUES ($1, $2, $3) RETURNING idcompra',
            [idOrganizacao, nomeFornecedor ?? null, observacoes ?? null]
        );
        const idCompra = compraResult.rows[0].idcompra;

        // Insere os itens, soma estoque e acumula total
        let valorTotal = 0;

        for (const item of itens) {
            const produtoExiste = await client.query(
                'SELECT 1 FROM produto WHERE idproduto = $1',
                [item.idProduto]
            );

            if (produtoExiste.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: `Produto ${item.idProduto} não encontrado.` });
            }

            await client.query(
                'INSERT INTO itemcompra (idcompra, idproduto, quantidade, precounitario) VALUES ($1, $2, $3, $4)',
                [idCompra, item.idProduto, item.quantidade, item.precoUnitario]
            );

            await client.query(
                'UPDATE produto SET quantidadeproduto = quantidadeproduto + $1 WHERE idproduto = $2',
                [item.quantidade, item.idProduto]
            );

            valorTotal += item.quantidade * item.precoUnitario;
        }

        // Salva o total calculado
        await client.query(
            'UPDATE compra SET valortotal = $1 WHERE idcompra = $2',
            [valorTotal, idCompra]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Compra registrada com sucesso.',
            idcompra: idCompra,
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

export const deletarCompra = async (req, res) => {
    const { idCompra } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM compra WHERE idcompra = $1 RETURNING idcompra',
            [idCompra]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Compra não encontrada.' });
        }

        return res.status(200).json({ message: 'Compra deletada com sucesso.' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};
