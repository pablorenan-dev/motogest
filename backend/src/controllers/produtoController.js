import pool from '../config/db.js';

export const getProdutos = async (req, res) => {
    const { idOrganizacao } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM produto WHERE idorganizacao = $1 ORDER BY nomeproduto ASC',
                [idOrganizacao]
            );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const criarProduto = async (req, res) => {
    const {idOrganizacao, idUsuario, nomeProduto, idProduto
        , descricaoProduto, precoProduto, quantidadeProduto, quantidadeMinimaProduto, criticoProduto, } = req.body;

    try{
        const result = await pool.query(
            'INSERT INTO produto (nomeproduto, descricaoproduto, precoproduto, quantidadeproduto, quantidademinimaproduto, idorganizacao) VALUES ($1, $2, $3, $4, $5, $6)',
            [nomeProduto, descricaoProduto, precoProduto, quantidadeProduto ?? 0, quantidadeMinimaProduto ?? 0, idOrganizacao]

        );

        return res.status(201).json({
            message: 'Produto cadastrado com sucesso.',
        });

    }catch(e){
        console.error(e);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

export const editarProduto = async (req, res) => {
    const { idproduto } = req.params;
    const { nomeProduto, descricaoProduto, precoProduto, quantidadeProduto, quantidadeMinimaProduto } = req.body;

    try {
        const result = await pool.query(
            `UPDATE produto
             SET nomeproduto = $1, descricaoproduto = $2, precoproduto = $3,
                 quantidadeproduto = $4, quantidademinimaproduto = $5
             WHERE idproduto = $6
             RETURNING *`,
            [nomeProduto, descricaoProduto, precoProduto, quantidadeProduto, quantidadeMinimaProduto, idproduto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        return res.status(200).json({
            message: 'Produto atualizado com sucesso.',
            produto: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const deletarProduto = async (req, res) => {
    const { idproduto } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM produto WHERE idproduto = $1 RETURNING *',
            [idproduto]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        return res.status(200).json({
            message: 'Produto deletado com sucesso.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};