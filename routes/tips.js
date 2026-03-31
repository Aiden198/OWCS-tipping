var express = require('express');
var router = express.Router();
const db = require('../database/db');

router.get('/', async function(req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const [tips] = await db.promise().query(`
      SELECT
        t.tip_id,
        t.match_id,
        t.selected_team_id,
        t.odds,
        t.amount_tipped,
        t.status,
        t.tip_time,

        m.match_datetime,
        m.completed,
        m.team_1_score,
        m.team_2_score,

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

      FROM tips t
      JOIN matches m ON t.match_id = m.match_id
      JOIN teams team1 ON m.team_1_id = team1.team_id
      JOIN teams team2 ON m.team_2_id = team2.team_id
      WHERE t.user_id = ?
        AND m.completed = FALSE
      ORDER BY m.match_datetime ASC
      LIMIT 10
    `, [req.session.user.userID]);

    const formattedTips = tips.map((tip) => {
      const selectedTeamName =
        tip.selected_team_id === tip.team_1_id
          ? tip.team_1_name
          : tip.team_2_name;

      const selectedTeamAbbreviation =
        tip.selected_team_id === tip.team_1_id
          ? tip.team_1_abbreviation
          : tip.team_2_abbreviation;

      const potentialPayout = Number(tip.amount_tipped) * Number(tip.odds);

      return {
        ...tip,
        selected_team_name: selectedTeamName,
        selected_team_abbreviation: selectedTeamAbbreviation,
        potential_payout: potentialPayout
      };
    });

    res.render('tips', {
      tips: formattedTips
    });
  } catch (err) {
    console.error('My Tips page error:', err);
    res.status(500).send('Error loading your tips');
  }
});

module.exports = router;