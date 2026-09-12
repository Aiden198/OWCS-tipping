const session = require('express-session');
const db = require('../db');
const MySQLSessionStore = require('./mysqlSessionStore');

const sessionStore = new MySQLSessionStore(db);
sessionStore.on('error', (err) => console.error('Session store error:', err));

const sessionMiddleware = session({
    store: sessionStore,
    secret: process.env.session_secret || "default",
    resave: false, // Store implements touch(), so it can refresh expiry without a full resave
    saveUninitialized: false, // Do not store uninitialised sessions
    rolling: true, // Refresh expiry on each request
    cookie: {
        httpOnly: true, // Prevent javascript access to cookie
        maxAge: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months expiration
        sameSite: 'Strict', // Prevent CSRF attacks
        secure: false
    }
});

module.exports = sessionMiddleware;