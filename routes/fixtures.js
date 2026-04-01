var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
  try {
    const [matches] = await db.query(`
      SELECT
        m.match_id,
        m.match_datetime,
        m.team_1_odds,
        m.team_2_odds,
        m.completed,
        m.status,
        m.region,
        m.team_1_score,
        m.team_2_score,

        t1.team_id AS team_1_db_id,
        t1.slug AS team_1_slug,
        t1.name AS team_1_name,
        t1.abbreviation AS team_1_abbreviation,
        t1.region AS team_1_region,
        t1.icon_path AS team_1_icon,

        t2.team_id AS team_2_db_id,
        t2.slug AS team_2_slug,
        t2.name AS team_2_name,
        t2.abbreviation AS team_2_abbreviation,
        t2.region AS team_2_region,
        t2.icon_path AS team_2_icon

      FROM matches m
      JOIN teams t1 ON m.team_1_id = t1.team_id
      JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.status = 'upcoming'
      ORDER BY m.match_datetime ASC
      LIMIT 10
    `);

    let existingTips = {};

    if (req.session.user) {
      const [tips] = await db.query(`
        SELECT match_id, selected_team_id, amount_tipped, odds, status
        FROM tips
        WHERE user_id = ?
      `, [req.session.user.userID]);

      existingTips = tips.reduce((acc, tip) => {
        acc[tip.match_id] = tip;
        return acc;
      }, {});
    }

    res.render('fixtures', {
      matches,
      existingTips
    });
  } catch (err) {
    console.error('Fixtures page error:', err);
    res.status(500).send('Error loading fixtures');
  }
});

module.exports = router;