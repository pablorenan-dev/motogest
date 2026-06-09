import jwt from 'jsonwebtoken';

const autenticar = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Fallback para query param — usado pelo EventSource (SSE) que não suporta headers
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

export default autenticar;
