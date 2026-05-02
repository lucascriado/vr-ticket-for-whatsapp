const { ImapFlow } = require('imapflow');

function makeClient() {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.TICKET_EMAIL ?? '',
      pass: process.env.GMAIL_APP_PASSWORD ?? '',
    },
    logger: false,
  });
}

async function getLastUid() {
  const client = makeClient();
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const status = await client.status('INBOX', { uidNext: true });
    return (status.uidNext ?? 1) - 1;
  } finally {
    lock.release();
    await client.logout();
  }
}

async function fetchVerificationCode(minUid = 0, timeoutMs = 90000) {
  const client = makeClient();
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');

  try {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const uids = await client.search({ uid: `${minUid + 1}:*` }, { uid: true });

      for (const uid of [...uids].reverse()) {
        const msg = await client.fetchOne(uid, { bodyParts: ['1', 'TEXT'], envelope: true }, { uid: true });
        const from = msg.envelope?.from?.[0]?.address ?? '';
        if (!from.includes('ticket.com.br') && !from.includes('edenred.com')) continue;

        const raw =
          msg.bodyParts?.get('1')?.toString('utf8') ??
          msg.bodyParts?.get('TEXT')?.toString('utf8') ??
          '';

        const decoded = raw
          .replace(/=\r?\n/g, '')
          .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const text = decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

        const match = text.match(/\b([1-9]\d{5})\b/);
        if (match) return match[1];
      }

      await new Promise((r) => setTimeout(r, 5000));
    }

    throw new Error('Código de verificação não encontrado no Gmail após 90s');
  } finally {
    lock.release();
    await client.logout();
  }
}

module.exports = { getLastUid, fetchVerificationCode };
