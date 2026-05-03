var express = require('express');
var router = express.Router();
const db = require('../db');

const leaderboardSelect = `
  SELECT
    u.user_id,
    u.username,
    u.credits,
    COALESCE(SUM(
      CASE
        WHEN t.status = 'pending' THEN t.amount_tipped
        ELSE 0
      END
    ), 0) AS outstanding_credits,
    (
      u.credits + COALESCE(SUM(
        CASE
          WHEN t.status = 'pending' THEN t.amount_tipped
          ELSE 0
        END
      ), 0)
    ) AS total_credits
  FROM users u
  LEFT JOIN tips t ON u.user_id = t.user_id
  GROUP BY u.user_id, u.username, u.credits
`;

router.get('/', async function(req, res) {
  try {
    const [topUsers] = await db.query(`
      ${leaderboardSelect}
      ORDER BY total_credits DESC, u.user_id ASC
      LIMIT 50
    `);

    let currentUserRank = null;

    if (req.session.user) {
      const currentUserId = req.session.user.userID;

      const [allUsersOrdered] = await db.query(`
        ${leaderboardSelect}
        ORDER BY total_credits DESC, u.user_id ASC
      `);

      const foundIndex = allUsersOrdered.findIndex(
        (user) => Number(user.user_id) === Number(currentUserId)
      );

      if (foundIndex !== -1) {
        currentUserRank = {
          rank: foundIndex + 1,
          username: allUsersOrdered[foundIndex].username,
          credits: allUsersOrdered[foundIndex].credits,
          outstanding_credits: allUsersOrdered[foundIndex].outstanding_credits,
          total_credits: allUsersOrdered[foundIndex].total_credits
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