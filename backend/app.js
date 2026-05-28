import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);

export default app;