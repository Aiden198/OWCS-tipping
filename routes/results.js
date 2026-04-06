var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
  try {
    const currentUserId = req.session.user ? req.session.user.userID : null;
    const selectedRegion = req.query.region ? req.query.region.trim() : '';

    const allRegions = ['EMEA', 'NA', 'China', 'Japan', 'Korea', 'Pacific'];

    const [regionRows] = await db.query(`
      SELECT
        c.competition_region,
        COUNT(*) AS match_count
      FROM matches m
      JOIN competitions c ON m.competition_id = c.competition_id
      WHERE m.completed = TRUE
        AND c.competition_region IS NOT NULL
        AND c.competition_region <> ''
      GROUP BY c.competition_region
    `);

    const regionCountMap = {};
    regionRows.forEach(row => {
      regionCountMap[row.competition_region] = row.match_count;
    });

    const regions = allRegions.map(region => ({
      name: region,
      count: regionCountMap[region] || 0
    }));

    let query = `
      SELECT
        m.match_id,
        m.match_datetime,
        m.completed,
        m.status,
        m.team_1_score,
        m.team_2_score,
        m.winning_team_id,
        m.match_format,
        m.round_label,

        c.competition_id,
        c.title AS competition_title,
        c.competition_region,
        c.stage_number,
        c.stage_type,

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
        t.status AS tip_status
      `;
    }

    query += `
      FROM matches m
      JOIN competitions c ON m.competition_id = c.competition_id
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
    `;

    const queryParams = [];

    if (currentUserId) {
      queryParams.push(currentUserId);
    }

    if (selectedRegion) {
      query += ` AND c.competition_region = ?`;
      queryParams.push(selectedRegion);
    }

    query += `
      ORDER BY m.match_datetime DESC
      LIMIT 20
    `;

    const [rows] = await db.query(query, queryParams);

    const results = rows.map((match) => {
      let userTip = null;

      if (currentUserId && match.tip_id) {
        const tippedCorrectly =
          Number(match.selected_team_id) === Number(match.winning_team_id);

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

    res.render('results', {
      results,
      user: req.session.user || null,
      regions,
      selectedRegion
    });
  } catch (err) {
    console.error('Results page error:', err);
    res.status(500).send('Error loading results');
  }
});

module.exports = router;