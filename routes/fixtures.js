var express = require('express');
var router = express.Router();
const db = require('../db');

router.get('/', async function(req, res) {
  try {
    const selectedRegion = req.query.region ? req.query.region.trim() : '';

    const allRegions = ['EMEA', 'NA', 'China', 'Japan', 'Korea', 'Pacific'];

    const [regionRows] = await db.query(`
      SELECT
        c.competition_region,
        COUNT(*) AS match_count
      FROM matches m
      JOIN competitions c ON m.competition_id = c.competition_id
      WHERE m.status = 'upcoming'
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

    let matchQuery = `
      SELECT
        m.match_id,
        m.match_datetime,
        m.team_1_odds,
        m.team_2_odds,
        m.completed,
        m.status,
        m.team_1_score,
        m.team_2_score,
        m.match_format,
        m.round_label,

        c.competition_id,
        c.title AS competition_title,
        c.competition_region,
        c.stage_number,
        c.stage_type,

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
      JOIN competitions c ON m.competition_id = c.competition_id
      JOIN teams t1 ON m.team_1_id = t1.team_id
      JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.status = 'upcoming'
    `;

    const matchParams = [];

    if (selectedRegion) {
      matchQuery += ` AND c.competition_region = ?`;
      matchParams.push(selectedRegion);
    }

    matchQuery += `
      ORDER BY
        CASE WHEN m.match_datetime IS NULL THEN 1 ELSE 0 END,
        m.match_datetime ASC
      LIMIT 20
    `;

    const [matches] = await db.query(matchQuery, matchParams);

    const matchIds = matches.map((m) => m.match_id);

    // ----- Community picks: how the userbase has tipped each match -----
    const communityPicks = {};
    matches.forEach((m) => {
      communityPicks[m.match_id] = { team1: 0, team2: 0, total: 0, team1Pct: 0, team2Pct: 0 };
    });

    if (matchIds.length) {
      const [pickRows] = await db.query(`
        SELECT match_id, selected_team_id, COUNT(*) AS cnt
        FROM tips
        WHERE match_id IN (?)
        GROUP BY match_id, selected_team_id
      `, [matchIds]);

      pickRows.forEach((row) => {
        const m = matches.find((mm) => Number(mm.match_id) === Number(row.match_id));
        if (!m) return;
        const entry = communityPicks[row.match_id];
        if (Number(row.selected_team_id) === Number(m.team_1_db_id)) {
          entry.team1 += Number(row.cnt);
        } else if (Number(row.selected_team_id) === Number(m.team_2_db_id)) {
          entry.team2 += Number(row.cnt);
        }
      });

      Object.values(communityPicks).forEach((e) => {
        e.total = e.team1 + e.team2;
        if (e.total > 0) {
          e.team1Pct = Math.round((e.team1 / e.total) * 100);
          e.team2Pct = 100 - e.team1Pct;
        }
      });
    }

    // ----- Recent form: last 5 completed results per team (W/L) -----
    const teamForm = {};
    const teamIds = [
      ...new Set(
        matches.flatMap((m) => [m.team_1_db_id, m.team_2_db_id]).filter(Boolean)
      )
    ];

    if (teamIds.length) {
      teamIds.forEach((id) => { teamForm[id] = []; });

      const [formRows] = await db.query(`
        SELECT match_id, match_datetime, team_1_id, team_2_id, winning_team_id
        FROM matches
        WHERE completed = 1
          AND winning_team_id IS NOT NULL
          AND (team_1_id IN (?) OR team_2_id IN (?))
        ORDER BY match_datetime DESC
      `, [teamIds, teamIds]);

      // formRows are newest-first; collect up to 5 per tracked team
      formRows.forEach((row) => {
        [row.team_1_id, row.team_2_id].forEach((tid) => {
          if (teamForm[tid] && teamForm[tid].length < 5) {
            teamForm[tid].push(Number(row.winning_team_id) === Number(tid) ? 'W' : 'L');
          }
        });
      });

      // reverse to chronological order (oldest -> newest, newest on the right)
      Object.keys(teamForm).forEach((id) => { teamForm[id].reverse(); });
    }

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
      existingTips,
      communityPicks,
      teamForm,
      user: req.session.user || null,
      regions,
      selectedRegion
    });
  } catch (err) {
    console.error('Fixtures page error:', err);
    res.status(500).send('Error loading fixtures');
  }
});

module.exports = router;