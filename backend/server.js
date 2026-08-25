require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const chatbotRoutes = require('./chatbot-routes');

const app = express();
const PORT = process.env.PORT || 5000;

// FIX (#9): fail fast and loudly at startup instead of only discovering a
// missing key on the first chat request. The chatbot route still keeps its
// own per-request check as defense-in-depth (env vars can technically be
// unset at runtime in some platforms), but this catches the common
// "forgot to configure .env before deploying" case immediately.
if (!process.env.GEMINI_API_KEY) {
  console.error(
    '\n[STARTUP WARNING] GEMINI_API_KEY is not set. ' +
    'The /api/chatbot/chat endpoint will return 500 errors until this is configured. ' +
    'See README.md -> "Gemini API Configuration".\n'
  );
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '\n[STARTUP ERROR] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. ' +
    'The backend cannot authenticate requests or reach the database without these. Exiting.\n'
  );
  process.exit(1);
}

// FIX (#6): required for express-rate-limit to correctly identify the real
// client IP when running behind any reverse proxy / load balancer (Render,
// Railway, Heroku, nginx, Cloudflare, etc.). Without this, req.ip resolves
// to the proxy's IP for every request, which either rate-limits all users
// as a single client or makes the limiter trivially bypassable via
// X-Forwarded-For spoofing depending on proxy config.
// `1` = trust the first hop (the platform's own edge proxy) — adjust if
// deployed behind additional proxies you control.
app.set('trust proxy', 1);

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
    // Now that 'trust proxy' is set correctly above, the default IP-based
    // keyGenerator will resolve real client IPs instead of the proxy IP.
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