var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
  try {
    const [topUsers] = await db.query(`
      SELECT
        user_id,
        username,
        credits
      FROM users
      ORDER BY credits DESC, user_id ASC
      LIMIT 50
    `);

    let currentUserRank = null;

    if (req.session.user) {
      const currentUserId = req.session.user.userID;

      const [allUsersOrdered] = await db.query(`
        SELECT
          user_id,
          username,
          credits
        FROM users
        ORDER BY credits DESC, user_id ASC
      `);

      const foundIndex = allUsersOrdered.findIndex(
        (user) => user.user_id === currentUserId
      );

      if (foundIndex !== -1) {
        currentUserRank = {
          rank: foundIndex + 1,
          username: allUsersOrdered[foundIndex].username,
          credits: allUsersOrdered[foundIndex].credits
        };
      }
    }

    res.render('leaderboard', {
      topUsers,
      currentUserRank
    });
  } catch (err) {
    console.error('Leaderboard page error:', err);
    res.status(500).send('Error loading leaderboard');
  }
});

module.exports = router;