const db = require("../../db");
const bcrypt = require("bcrypt");
var express = require('express');
var router = express.Router();
const { sendNewUserAlert } = require('../../services/emailService');

router.post('/', async function (req, res, next) {
    console.log("Signup request received");

    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        console.log("Input fields are empty!");
        return res.status(400).send("Ensure all fields are filled in.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.match(emailRegex)) {
        console.log("Invalid email format");
        return res.status(400).send("Invalid email");
    }

    try {
        const [results] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (results.length > 0) {
            console.log(`Email: ${email} already exists in the database`);
            return res.status(401).send("Email already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [[{ count }]] = await db.query(
            'SELECT COUNT(*) AS count FROM users'
        );

        const isAdmin = count === 0 ? 1 : 0;

        const [insertUser] = await db.query(
            'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, isAdmin]
        );

        console.log(`User ${email} successfully added to database`);

        sendNewUserAlert({
            username: username,
            email: email
        }).catch((emailErr) => {
            console.error("Failed to send new user email:", emailErr);
        });

        req.session.user = {
            username: username,
            email: email,
            userID: insertUser.insertId,
            is_admin: isAdmin,
            credits: 1000
        };

        console.log("User session created:", req.session.user);
        res.status(200).send("User registered successfully");
    } catch (err) {
        console.error("Signup Error", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;