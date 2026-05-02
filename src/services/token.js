const axios = require('axios');

const B2C_TENANT = process.env.B2C_TENANT ?? '';
const B2C_POLICY = process.env.B2C_POLICY ?? '';
const CLIENT_ID = process.env.B2C_CLIENT_ID ?? '';
const REDIRECT_URI = 'https://www.ticket.com.br/portal-usuario/meus-cartoes';
const AUTHORIZE_URL = `https://ticketmobile.b2clogin.com/${B2C_TENANT}/oauth2/v2.0/authorize`;

const state = {
  accessToken: '',
  expiresAt: 0,
};

function init() {
  state.accessToken = process.env.TICKET_ACCESS_TOKEN ?? '';
  state.expiresAt = Number(process.env.TICKET_TOKEN_EXPIRES_AT ?? 0);
}

function isExpiringSoon(bufferSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  return state.expiresAt - now < bufferSeconds;
}

async function silentRenewal() {
  const params = new URLSearchParams({
    p: B2C_POLICY,
    client_id: CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: REDIRECT_URI,
    scope: 'openid',
    nonce: 'defaultNonce',
    prompt: 'none',
  });

  const response = await axios.get(`${AUTHORIZE_URL}?${params}`, {
    maxRedirects: 0,
    validateStatus: (status) => status === 302,
    headers: {
      Cookie: process.env.B2C_SSO_COOKIE ?? '',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const location = response.headers['location'];
  if (!location) throw new Error('Silent renewal: sem header Location na resposta');

  const fragment = location.split('#')[1] ?? '';
  const idToken = new URLSearchParams(fragment).get('id_token');

  if (!idToken) {
    const error = new URLSearchParams(fragment).get('error');
    throw new Error(`Silent renewal falhou: ${error ?? 'token não encontrado na resposta'}`);
  }

  const rawPayload = idToken.split('.')[1] ?? '';
  const payload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString());

  state.accessToken = idToken;
  state.expiresAt = payload.exp;

  console.log(`[TokenService] Token renovado. Expira em ${new Date(payload.exp * 1000).toISOString()}`);

  const setCookie = response.headers['set-cookie'];
  if (setCookie) {
    const ssoCookie = setCookie.find((c) => c.includes('x-ms-cpim-sso'));
    if (ssoCookie) {
      process.env.B2C_SSO_COOKIE = ssoCookie.split(';')[0] ?? process.env.B2C_SSO_COOKIE;
    }
  }
}

async function getAccessToken() {
  if (isExpiringSoon()) await silentRenewal();
  return state.accessToken;
}

module.exports = { init, isExpiringSoon, silentRenewal, getAccessToken };
