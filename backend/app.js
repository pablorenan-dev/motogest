import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import autenticar from './src/middlewares/autenticar.js';
import authRoutes from './src/routes/authRoutes.js';
import produtoRoutes from './src/routes/produtoRoutes.js';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import organizacaoRoutes from './src/routes/organizacaoRoutes.js';
import motoRoutes from './src/routes/motoRoutes.js';
import contatoRoutes from './src/routes/contatoRoutes.js';
import servicoRoutes from './src/routes/servicoRoutes.js';
import vendaRoutes from './src/routes/vendaRoutes.js';
import compraRoutes from './src/routes/compraRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rota pública — não exige token
app.use('/api/auth', authRoutes);

// Todas as rotas abaixo exigem token válido
app.use('/api/produtos', autenticar, produtoRoutes);
app.use('/api/usuarios', autenticar, usuarioRoutes);
app.use('/api/organizacoes', autenticar, organizacaoRoutes);
app.use('/api/motos', autenticar, motoRoutes);
app.use('/api/contatos', autenticar, contatoRoutes);
app.use('/api/servicos', autenticar, servicoRoutes);
app.use('/api/vendas', autenticar, vendaRoutes);
app.use('/api/compras', autenticar, compraRoutes);

export default app;