const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('dashboard/index', { title: 'Můj dashboard' });
});

module.exports = router;
