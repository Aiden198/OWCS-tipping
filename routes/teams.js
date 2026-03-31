var express = require('express');
var router = express.Router();
const db = require('../database/db');

router.get('/', async function(req, res) {
  try {
    const [teams] = await db.query(`
      SELECT
        team_id,
        slug,
        name,
        abbreviation,
        region,
        icon_path,
        liquipedia_url,
        active
      FROM teams
      WHERE active = TRUE
      ORDER BY region ASC, name ASC
    `);

    const teamsByRegion = teams.reduce((acc, team) => {
      if (!acc[team.region]) {
        acc[team.region] = [];
      }
      acc[team.region].push(team);
      return acc;
    }, {});

    res.render('teams', { teamsByRegion });
  } catch (err) {
    console.error('Teams page error:', err);
    res.status(500).send('Error loading teams');
  }
});

module.exports = router;