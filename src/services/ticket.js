const axios = require('axios');
const token = require('./token');

const BASE_URL = 'https://api.ticket.edenred.com';

async function getCardBalance() {
  const accessToken = await token.getAccessToken();

  const { data } = await axios.get(
    `${BASE_URL}/wallet/balance/v1/card/${process.env.TICKET_CARD_ID}`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-jwt-assertion': accessToken,
        'x-user-id': process.env.X_USER_ID ?? '',
        accept: 'application/json',
      },
    }
  );

  const item = Array.isArray(data) ? data.find((b) => b.value !== undefined) : null;
  return item?.value ?? 0;
}

module.exports = { getCardBalance };
