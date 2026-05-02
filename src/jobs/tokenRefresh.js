const cron = require('node-cron');
const token = require('../services/token');

function startTokenRefreshJob() {
  cron.schedule('*/30 * * * *', async () => {
    if (!token.isExpiringSoon(3600)) return;

    console.log('[TokenRefreshJob] Token expirando em breve, renovando...');
    try {
      await token.silentRenewal();
    } catch (err) {
      console.error(`[TokenRefreshJob] Falha: ${err.message}`);
      console.error('[TokenRefreshJob] AÇÃO NECESSÁRIA: atualize B2C_SSO_COOKIE no .env');
    }
  });

  console.log('[TokenRefreshJob] Iniciado — verifica a cada 30 min');
}

module.exports = { startTokenRefreshJob };
