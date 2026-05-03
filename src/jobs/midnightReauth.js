const cron = require('node-cron');
const { forceReauth } = require('../services/token');

function startMidnightReauthJob() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[MidnightReauth] Iniciando reautenticação preventiva...');
    try {
      await forceReauth();
      console.log('[MidnightReauth] Concluído com sucesso.');
    } catch (err) {
      console.error(`[MidnightReauth] Falha: ${err.message}`);
    }
  });

  console.log('[MidnightReauth] Iniciado — executa toda meia-noite (00:00)');
}

module.exports = { startMidnightReauthJob };
