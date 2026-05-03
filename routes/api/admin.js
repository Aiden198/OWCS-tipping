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

router.get('/recent-tips', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        tips.tip_id,
        tips.amount_tipped,
        tips.odds,
        tips.status,
        tips.tip_time,

        users.username,
        users.email,

        matches.match_datetime,

        team1.name AS team_1_name,
        team2.name AS team_2_name,
        selected.name AS selected_team_name

      FROM tips
      JOIN users ON tips.user_id = users.user_id
      JOIN matches ON tips.match_id = matches.match_id
      JOIN teams AS team1 ON matches.team_1_id = team1.team_id
      JOIN teams AS team2 ON matches.team_2_id = team2.team_id
      JOIN teams AS selected ON tips.selected_team_id = selected.team_id

      ORDER BY tips.tip_time DESC
      LIMIT 30
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching recent tips:", err);
    res.status(500).send("Server error");
  }
});

//router.post('/api/admin/sync-matches', matchesController.syncMatchesNow);

module.exports = router;
