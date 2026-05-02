require('dotenv/config');
const app = require('./app');
const { init: initToken } = require('./services/token');
const { startTokenRefreshJob } = require('./jobs/tokenRefresh');
const { registerWebhook } = require('./services/evolution');
const PORT = process.env.PORT ?? 3000;

initToken();
startTokenRefreshJob();

app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  try {
    await registerWebhook();
  } catch (err) {
    console.warn('[Evolution] Webhook não registrado:', err.message);
  }
});
