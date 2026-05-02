const { Router } = require('express');
const { getCardBalance } = require('../services/ticket');
const { sendMessage } = require('../services/evolution');

const router = Router();
const processedIds = new Set();

router.post('/', async (req, res) => {
  res.sendStatus(200);

  const event = req.body;

  if (event.event !== 'messages.upsert') return;

  const key = event.data?.key ?? {};
  const messageId = key.id;
  const rawJid = key.remoteJid ?? '';

  const remoteJid = (rawJid.endsWith('@lid') && key.remoteJidAlt
    ? key.remoteJidAlt
    : rawJid).trim();

  const text = (
    event.data?.message?.conversation ??
    event.data?.message?.extendedTextMessage?.text ??
    ''
  ).trim().toLowerCase();

  console.log(`[Webhook] id=${messageId} from=${remoteJid} text="${text}"`);

  if (!remoteJid || remoteJid.endsWith('@lid')) return;
  if (text !== '/ticket saldo') return;

  if (messageId) {
    if (processedIds.has(messageId)) return;
    processedIds.add(messageId);
    setTimeout(() => processedIds.delete(messageId), 5000);
  }

  try {
    const balance = await getCardBalance();
    const formatted = balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await sendMessage(remoteJid, `Saldo Ticket Restaurante: ${formatted}`);
  } catch (err) {
    console.error('[Webhook] Erro:', err.message);
    try { await sendMessage(remoteJid, 'Erro ao consultar saldo. Tente novamente.'); } catch {}
  }
});

module.exports = router;
