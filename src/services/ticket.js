const crypto = require('crypto');
const axios = require('axios');
const token = require('./token');

const BASE_URL = 'https://api.ticket.edenred.com';

function makeHeaders(accessToken) {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-jwt-assertion': accessToken,
    'x-user-id': process.env.X_USER_ID ?? '',
    accept: 'application/json',
    'x-mobile-agent': 'WEB',
    'Request-Id': crypto.randomUUID(),
    origin: 'https://www.ticket.com.br',
    referer: 'https://www.ticket.com.br/',
  };
}

// Card ID resolved at runtime from wallet API; TICKET_CARD_ID env is only a hint
let _cardId = null;

async function resolveCardId(accessToken) {
  if (_cardId) return _cardId;

  const { data } = await axios.get(`${BASE_URL}/wallet/v1`, { headers: makeHeaders(accessToken) });
  const cards = Array.isArray(data) ? data : [];
  const card = cards.find((c) => c.product?.type === 'TRE') ?? cards[0];
  if (!card) throw new Error('Nenhum cartao Ticket encontrado na carteira');

  _cardId = card.id;
  console.log(`[Ticket] Cartao resolvido: ${_cardId}`);
  return _cardId;
}

async function getCardBalance() {
  const accessToken = await token.getAccessToken();
  const cardId = await resolveCardId(accessToken);
  const { data } = await axios.get(
    `${BASE_URL}/wallet/balance/v1/card/${cardId}`,
    { headers: makeHeaders(accessToken) },
  );
  const item = Array.isArray(data) ? data.find((b) => b.value !== undefined) : null;
  return item?.value ?? 0;
}

async function getStatement(limit = 15) {
  const accessToken = await token.getAccessToken();
  const cardId = await resolveCardId(accessToken);
  const { data } = await axios.get(
    `${BASE_URL}/wallet/statement/v1/card/${cardId}`,
    { headers: makeHeaders(accessToken) },
  );
  return (Array.isArray(data) ? data : []).slice(0, limit);
}

module.exports = { getCardBalance, getStatement };
