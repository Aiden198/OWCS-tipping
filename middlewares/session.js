const session = require('express-session');

// USING A MEMORY STORE!!! DATA WILL NOT PERSIST ON RESTART!!!

const sessionMiddleware = session({
    secret: process.env.session_secret || "default",
    resave: true, // Do not resave session if not modified
    saveUninitialized: false, // Do not store uninitialised sessions
    rolling: true, // Refresh expiry on each request
    cookie: {
        httpOnly: true, // Prevent javascript access to cookie
        maxAge: 3600000, // 1 hour expiration
        sameSite: 'Strict', // Prevent CSRF attacks
        secure: false
    }
});

module.exports = sessionMiddleware;