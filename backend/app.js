import express from 'express';
import cors from 'cors';
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

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/organizacoes', organizacaoRoutes);
app.use('/api/motos', motoRoutes);
app.use('/api/contatos', contatoRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/compras', compraRoutes);

export default app;