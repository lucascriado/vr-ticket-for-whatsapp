const express = require('express');
const cardRoutes = require('./routes/card');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(express.json());

app.use('/card', cardRoutes);
app.use('/webhook', webhookRoutes);

// Handle JSON body parse errors (e.g. malformed Evolution API retries)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.sendStatus(400);
  next(err);
});

module.exports = app;
