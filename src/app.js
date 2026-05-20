require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { pollMailbox } = require('./services/imap');

const app = express();
const BASE = process.env.BASE_PATH || '/familyhub';

app.use(cors());
app.use(express.json());

// API routes
const api = express.Router();
api.use('/auth', require('./routes/auth'));
api.use('/tasks', require('./routes/tasks'));
api.use('/emails', require('./routes/emails'));
api.use('/tags', require('./routes/tags'));
api.use('/users', require('./routes/users'));
api.use('/status', require('./routes/status'));

app.use(`${BASE}/api`, api);

// Serve React frontend
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(BASE, express.static(clientDist));
app.get(`${BASE}/*path`, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// IMAP polling
const intervalMinutes = Number(process.env.IMAP_POLL_INTERVAL) || 2;
cron.schedule(`*/${intervalMinutes} * * * *`, () => {
  pollMailbox().catch(err => console.error('Poll failed:', err));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`FamilyHub running on port ${PORT} at ${BASE}`);
  // Initial poll on startup
  pollMailbox().catch(err => console.error('Initial poll failed:', err));
});
