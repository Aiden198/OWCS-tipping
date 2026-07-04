var express = require('express');
var router = express.Router();
const db = require('../db');

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
        AND region IS NOT NULL
        AND region <> ''
        AND LOWER(region) <> 'unknown'
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

// Team ELO ratings ladder — sortable by region or all teams.
router.get('/ratings', async function (req, res) {
  try {
    const selectedRegion = req.query.region ? req.query.region.trim() : '';

    const [allTeams] = await db.query(`
      SELECT
        team_id,
        slug,
        name,
        abbreviation,
        region,
        icon_path,
        rating
      FROM teams
      WHERE active = TRUE
        AND region IS NOT NULL
        AND region <> ''
        AND LOWER(region) <> 'unknown'
      ORDER BY rating DESC, name ASC
    `);

    const regions = [...new Set(allTeams.map((t) => t.region).filter(Boolean))].sort();

    const teams = selectedRegion
      ? allTeams.filter((t) => t.region === selectedRegion)
      : allTeams;

    const ratings = teams.map((t) => Number(t.rating));
    const maxRating = ratings.length ? Math.max(...ratings) : 0;
    const minRating = ratings.length ? Math.min(...ratings) : 0;

    res.render('teamRatings', {
      teams,
      regions,
      selectedRegion,
      maxRating,
      minRating
    });
  } catch (err) {
    console.error('Team ratings page error:', err);
    res.status(500).send('Error loading team ratings');
  }
});

module.exports = router;