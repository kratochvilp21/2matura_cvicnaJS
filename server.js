// server.js
process.on('uncaughtException', e => console.error('uncaughtException:', e));
process.on('unhandledRejection', e => console.error('unhandledRejection:', e));

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// inicializace DB souboru a tabulek
require('./db');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// session v SQLite
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
app.use(session({
  name: 'sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'app.db', dir: __dirname }),
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

// user do šablon
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// trasy
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// root přesměrování
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  return res.redirect('/auth/login');
});

// 404 fallback
app.use((req, res) => res.status(404).send('404 - Not Found'));

// >>> DŮLEŽITÉ: server naslouchá (tohle musí běžet)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
