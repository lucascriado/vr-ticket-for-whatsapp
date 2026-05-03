require('dotenv/config');
const app = require('./app');
const { init: initToken } = require('./services/token');
const { startTokenRefreshJob } = require('./jobs/tokenRefresh');
const { startMidnightReauthJob } = require('./jobs/midnightReauth');
const { registerWebhook } = require('./services/evolution');
const PORT = process.env.PORT ?? 3000;

initToken();
startTokenRefreshJob();
startMidnightReauthJob();

app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  try {
    await registerWebhook();
  } catch (err) {
    console.warn('[Evolution] Webhook não registrado:', err.message);
  }
});
