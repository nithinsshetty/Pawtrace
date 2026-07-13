require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const db = require('./db');
const chatbotRoutes = require('./chatbot-routes');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true, // Allow all origins or specify frontend origins
  credentials: true
}));
app.use(express.json());

async function startServer() {
  // 1. Initialize database connection pool and run schema if empty
  await db.initDB();

  // 2. Configure session store using initialized DB pool
  const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000, // 24 hours
    createDatabaseTable: false // schema.sql creates the sessions table explicitly
  }, db.getPool());

  app.use(session({
    key: 'pawtrace_sid',
    secret: process.env.SESSION_SECRET || 'pawtrace_secret_key_123',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true on production HTTPS
      httpOnly: true,
      maxAge: 86400000 // 24 hours
    }
  }));

  // API router bindings
  app.use('/api/chatbot', chatbotRoutes);

  // Health check route
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
  });

  app.listen(PORT, () => {
    console.log(`PawTrace API Server running on port ${PORT}`);
  });
}

startServer();
