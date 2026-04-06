const express = require('express');
const router = express.Router();
const db = require('../../db'); // Adjust path as needed
const isAuthenticated = require('../../middlewares/auth');
const isAdmin = require('../../middlewares/isAdmin');

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT user_id, username, email, is_admin FROM users");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).send("Server error");
    }
});

//router.post('/api/admin/sync-matches', matchesController.syncMatchesNow);

module.exports = router;
