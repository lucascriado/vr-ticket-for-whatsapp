const { Router } = require('express');
const { getCardBalance } = require('../services/ticket');

const router = Router();

router.get('/balance', async (req, res) => {
  try {
    const balance = await getCardBalance();
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
