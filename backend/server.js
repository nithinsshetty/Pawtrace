require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatbotRoutes = require('./chatbot-routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api/chatbot', chatbotRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`PawTrace API Server running on port ${PORT}`);
});