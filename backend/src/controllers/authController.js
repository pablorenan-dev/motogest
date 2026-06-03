import pool from '../config/db.js';

export const cadastro = async (req, res) => {
    const { nomeUsuario, emailUsuario, senhaUsuario, idOrganizacao } = req.body;

    if (!nomeUsuario || !emailUsuario || !senhaUsuario || !idOrganizacao) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        const emailExiste = await pool.query(
            'SELECT 1 FROM usuario WHERE "emailUsuario" = $1',
            [emailUsuario]
        );

        if (emailExiste.rows.length > 0) {
            return res.status(409).json({ error: 'Email já cadastrado.' });
        }

        const result = await pool.query(
            `INSERT INTO usuario ("nomeUsuario", "emailUsuario", "senhaUsuario", "idOrganizacao")
             VALUES ($1, $2, $3, $4)
             RETURNING "idUsuario", "nomeUsuario", "emailUsuario", "idOrganizacao"`,
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

export const login = async (req, res) => {
    const { emailUsuario, senhaUsuario } = req.body;

    if (!emailUsuario || !senhaUsuario) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM usuario WHERE emailusuario = $1 AND senhausuario = $2',
            [emailUsuario, senhaUsuario]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const usuario = result.rows[0];

        return res.status(200).json({
            message: 'Login realizado com sucesso.',
            usuario: {
                idUsuario: usuario.idusuario,
                nomeUsuario: usuario.nomeusuario,
                emailUsuario: usuario.emailusuario,
                idOrganizacao: usuario.idorganizacao
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};