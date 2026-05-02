const axios = require('axios');

const api = axios.create({
  baseURL: process.env.EVOLUTION_URL ?? 'http://localhost:8080',
  headers: { apikey: process.env.EVOLUTION_API_KEY ?? '' },
});

const INSTANCE = () => process.env.EVOLUTION_INSTANCE ?? '';

async function sendMessage(to, text) {
  console.log(`[Evolution] Enviando para ${to}`);
  try {
    await api.post(`/message/sendText/${INSTANCE()}`, { number: to, text });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('[Evolution] Erro ao enviar:', JSON.stringify(err.response?.data));
    }
    throw err;
  }
}

async function registerWebhook() {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  await api.post(`/webhook/set/${INSTANCE()}`, {
    webhook: {
      enabled: true,
      url: webhookUrl,
      events: ['MESSAGES_UPSERT'],
    },
  });

  console.log(`[Evolution] Webhook registrado: ${webhookUrl}`);
}

module.exports = { sendMessage, registerWebhook };
