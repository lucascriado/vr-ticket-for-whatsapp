const puppeteer = require('puppeteer');
const { fetchVerificationCode } = require('./gmail');

const REDIRECT_URI = 'https://www.ticket.com.br/portal-usuario/meus-cartoes';
const B2C_TENANT = process.env.B2C_TENANT ?? '';
const B2C_POLICY = process.env.B2C_POLICY ?? '';
const CLIENT_ID = process.env.B2C_CLIENT_ID ?? '';
const AUTHORIZE_URL = `https://ticketmobile.b2clogin.com/${B2C_TENANT}/oauth2/v2.0/authorize`;

async function reauth() {
  console.log('[Reauth] Iniciando login automático via Puppeteer...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const params = new URLSearchParams({
    p: B2C_POLICY,
    client_id: CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: REDIRECT_URI,
    scope: 'openid',
    nonce: 'defaultNonce',
    prompt: 'login',
  });

  let idToken = null;
  let ssoCookie = null;

  try {
    await page.goto(`${AUTHORIZE_URL}?${params}`, { waitUntil: 'networkidle2' });

    // Preenche email no campo customizado do template
    await page.waitForSelector('#login', { timeout: 15000 });
    await page.type('#login', process.env.TICKET_EMAIL ?? '');

    // Preenche senha (injetada pelo B2C no #api)
    await page.waitForSelector('#password', { timeout: 15000 });
    await page.type('#password', process.env.TICKET_PASSWORD ?? '');

    // Clica no botão next (injetado pelo B2C)
    await page.waitForSelector('#next', { timeout: 10000 });
    await page.click('#next');

    // Aguarda os botões de MFA aparecerem e chama setEmailMFA() diretamente
    await page.waitForSelector('#mfa-option-email:not(.d-none)', { timeout: 15000 });
    const mfaRequestedAt = new Date();
    await page.evaluate(() => setEmailMFA());
    console.log('[Reauth] MFA por e-mail solicitado, aguardando código no Gmail...');

    // Aguarda o campo do código aparecer (B2C envia o email e renderiza o input)
    await page.waitForSelector('#VerificationCode', { timeout: 30000 });

    // Lê o código no Gmail buscando só emails chegados após o pedido de MFA
    const code = await fetchVerificationCode(mfaRequestedAt);
    console.log(`[Reauth] Código recebido: ${code}`);

    await page.type('#VerificationCode', code);

    // Clica em verificar código
    await page.waitForSelector('#signinEmailVerificationControl_but_verify_code', { timeout: 5000 });
    await page.click('#signinEmailVerificationControl_but_verify_code');

    // Aguarda #continue ficar visível (após verificação bem-sucedida) e clica manualmente
    // como fallback caso o skipSteps() do template não dispare em headless
    try {
      await page.waitForSelector('#continue:not(.d-none)', { timeout: 15000 });
      await page.click('#continue');
    } catch {
      // skipSteps() já clicou ou o redirect aconteceu antes
    }

    // Aguarda redirect para ticket.com.br com o token na URL
    await page.waitForFunction(
      (redirect) => window.location.href.startsWith(redirect),
      { timeout: 30000 },
      REDIRECT_URI,
    );

    const finalUrl = page.url();
    const fragment = finalUrl.split('#')[1] ?? '';
    idToken = new URLSearchParams(fragment).get('id_token');

    if (!idToken) throw new Error('id_token não encontrado na URL de redirect');

    // Extrai o cookie SSO do B2C
    const cookies = await page.cookies('https://ticketmobile.b2clogin.com');
    const sso = cookies.find((c) => c.name.startsWith('x-ms-cpim-sso'));
    if (sso) ssoCookie = `${sso.name}=${sso.value}`;

  } finally {
    await browser.close();
  }

  console.log('[Reauth] Login automático concluído.');
  return { idToken, ssoCookie };
}

module.exports = { reauth };
