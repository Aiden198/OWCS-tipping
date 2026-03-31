var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
  try {
    const currentUserId = req.session.user ? req.session.user.userID : null;

    let query = `
      SELECT
        m.match_id,
        m.match_datetime,
        m.completed,
        m.team_1_score,
        m.team_2_score,
        m.winning_team_id,

        team1.team_id AS team_1_id,
        team1.name AS team_1_name,
        team1.abbreviation AS team_1_abbreviation,
        team1.region AS team_1_region,
        team1.icon_path AS team_1_icon,

        team2.team_id AS team_2_id,
        team2.name AS team_2_name,
        team2.abbreviation AS team_2_abbreviation,
        team2.region AS team_2_region,
        team2.icon_path AS team_2_icon
    `;

    if (currentUserId) {
      query += `,
        t.tip_id,
        t.selected_team_id,
        t.odds,
        t.amount_tipped,
        t.status
      `;
    }

    query += `
      FROM matches m
      JOIN teams team1 ON m.team_1_id = team1.team_id
      JOIN teams team2 ON m.team_2_id = team2.team_id
    `;

    if (currentUserId) {
      query += `
        LEFT JOIN tips t
          ON m.match_id = t.match_id
         AND t.user_id = ?
      `;
    }

    query += `
      WHERE m.completed = TRUE
      ORDER BY m.match_datetime DESC
      LIMIT 25
    `;

    const [rows] = currentUserId
      ? await db.promise().query(query, [currentUserId])
      : await db.promise().query(query);

    const results = rows.map((match) => {
      let userTip = null;

      if (currentUserId && match.tip_id) {
        const tippedCorrectly = Number(match.selected_team_id) === Number(match.winning_team_id);
        const amountTipped = Number(match.amount_tipped);
        const odds = Number(match.odds);
        const payout = tippedCorrectly ? amountTipped * odds : 0;
        const netChange = tippedCorrectly ? payout - amountTipped : -amountTipped;

        const selectedTeamName =
          Number(match.selected_team_id) === Number(match.team_1_id)
            ? match.team_1_name
            : match.team_2_name;

        const selectedTeamAbbreviation =
          Number(match.selected_team_id) === Number(match.team_1_id)
            ? match.team_1_abbreviation
            : match.team_2_abbreviation;

        userTip = {
          selected_team_id: match.selected_team_id,
          selected_team_name: selectedTeamName,
          selected_team_abbreviation: selectedTeamAbbreviation,
          odds,
          amount_tipped: amountTipped,
          tipped_correctly: tippedCorrectly,
          payout,
          net_change: netChange
        };
      }

      return {
        ...match,
        userTip
      };
    });

    res.render('results', { results });
  } catch (err) {
    console.error('Results page error:', err);
    res.status(500).send('Error loading results');
  }
});

module.exports = router;