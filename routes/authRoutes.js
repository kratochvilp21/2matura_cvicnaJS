const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Přihlášení', old: {}, errors: [] });
});

router.post(
  '/login',
  body('username').trim().matches(/^[a-zA-Z0-9._-]+$/).withMessage('Použij jen písmena/čísla/._-'),
  body('password').isLength({ min: 6 }).withMessage('Heslo musí mít alespoň 6 znaků'),
  (req, res) => {
    const errors = validationResult(req);
    const old = { username: req.body.username || '' };
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login', { title: 'Přihlášení', old, errors: errors.array() });
    }

    const { username, password } = req.body;
    db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) return res.status(500).send('DB error');
      if (!user) {
        return res.status(400).render('auth/login', { title: 'Přihlášení', old, errors: [{ msg: 'Neplatné přihlašovací údaje' }] });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(400).render('auth/login', { title: 'Přihlášení', old, errors: [{ msg: 'Neplatné přihlašovací údaje' }] });
      }
      req.session.user = { id: user.id, username: user.username };
      res.redirect('/dashboard');
    });
  }
);

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Registrace', old: {}, errors: [] });
});

router.post(
  '/register',
  body('username').trim().matches(/^[a-zA-Z0-9._-]+$/).withMessage('Použij jen písmena/čísla/._-'),
  body('password').isLength({ min: 6 }).withMessage('Heslo musí mít alespoň 6 znaků'),
  body('confirm').custom((v, { req }) => v === req.body.password).withMessage('Hesla se neshodují'),
  body('aiConsent').equals('on').withMessage('Musíš souhlasit se zpracováním dat'),
  async (req, res) => {
    const errors = validationResult(req);
    const old = { username: req.body.username || '', aiConsent: req.body.aiConsent === 'on' };
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register', { title: 'Registrace', old, errors: errors.array() });
    }

    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password_hash, ai_consent) VALUES (?, ?, ?)', [username, hash, 1], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).render('auth/register', { title: 'Registrace', old, errors: [{ msg: 'Uživatelské jméno je již obsazené' }] });
        }
        return res.status(500).send('DB error');
      }
      req.session.user = { id: this.lastID, username };
      res.redirect('/dashboard');
    });
  }
);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/auth/login');
  });
});

module.exports = router;
