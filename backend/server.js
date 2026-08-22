require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const chatbotRoutes = require('./chatbot-routes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://nithinsshetty.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '100kb' }));

const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many chatbot requests. Please try again later.'
    }
});

app.use('/api/chatbot', chatbotLimiter, chatbotRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date()
    });
});

app.listen(PORT, () => {
    console.log(`PawTrace API Server running on port ${PORT}`);
});