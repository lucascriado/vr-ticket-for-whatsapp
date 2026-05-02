const express = require('express');
const cardRoutes = require('./routes/card');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(express.json());
app.use('/card', cardRoutes);
app.use('/webhook', webhookRoutes);

module.exports = app;
