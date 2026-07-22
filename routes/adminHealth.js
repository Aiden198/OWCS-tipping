const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

const SAMPLE_LIMIT = 100;

// ---- Page ----
router.get('/adminHealth', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminHealth');
});

// ---- Health / triage data ----
router.get('/api/admin/health', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Summary
    const [[summary]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM matches) AS matches,
        (SELECT COUNT(*) FROM matches WHERE status = 'upcoming') AS upcoming,
        (SELECT COUNT(*) FROM matches WHERE status = 'live') AS live,
        (SELECT COUNT(*) FROM matches WHERE completed = 1 AND resolved = 0) AS unresolved,
        (SELECT COUNT(*) FROM tips WHERE status = 'pending') AS pending_tips,
        (SELECT COALESCE(SUM(credits), 0) FROM users) AS credits_in_circulation
    `);

    // 1) Completed matches awaiting resolution (pending payouts)
    const [unresolved] = await db.query(`
      SELECT
        m.match_id, m.match_datetime,
        COALESCE(t1.name, m.source_team_1_name) AS t1,
        COALESCE(t2.name, m.source_team_2_name) AS t2,
        (SELECT COUNT(*) FROM tips tp WHERE tp.match_id = m.match_id AND tp.status = 'pending') AS pending_tips
      FROM matches m
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.completed = 1 AND m.resolved = 0
      ORDER BY m.match_datetime ASC
      LIMIT ${SAMPLE_LIMIT}
    `);

    // 2) Unmapped teams (source name present but not linked to a team) on unresolved matches
    const [unmapped] = await db.query(`
      SELECT
        m.match_id, m.match_datetime, m.status,
        m.team_1_id, m.team_2_id,
        m.source_team_1_name, m.source_team_2_name
      FROM matches m
      WHERE (m.team_1_id IS NULL OR m.team_2_id IS NULL)
        AND m.resolved = 0
      ORDER BY m.match_datetime ASC
      LIMIT ${SAMPLE_LIMIT}
    `);

    // 3) Upcoming matches missing odds (teams mapped, but no odds)
    const [missingOdds] = await db.query(`
      SELECT
        m.match_id, m.match_datetime,
        COALESCE(t1.name, m.source_team_1_name) AS t1,
        COALESCE(t2.name, m.source_team_2_name) AS t2
      FROM matches m
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.status = 'upcoming'
        AND m.team_1_id IS NOT NULL AND m.team_2_id IS NOT NULL
        AND (m.team_1_odds IS NULL OR m.team_2_odds IS NULL)
      ORDER BY m.match_datetime ASC
      LIMIT ${SAMPLE_LIMIT}
    `);

    // 4) Upcoming matches with no scheduled date
    const [missingDate] = await db.query(`
      SELECT
        m.match_id,
        COALESCE(t1.name, m.source_team_1_name) AS t1,
        COALESCE(t2.name, m.source_team_2_name) AS t2
      FROM matches m
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.status = 'upcoming' AND m.match_datetime IS NULL
      LIMIT ${SAMPLE_LIMIT}
    `);

    // 5) Active teams with unknown/empty region
    const [unknownRegion] = await db.query(`
      SELECT team_id, name, region
      FROM teams
      WHERE active = 1
        AND (region IS NULL OR region = '' OR LOWER(region) = 'unknown')
      ORDER BY name ASC
      LIMIT ${SAMPLE_LIMIT}
    `);

    // Shape each issue for the client.
    const fmtMatch = (m) => ({
      text: `${m.t1 || '?'} vs ${m.t2 || '?'}`,
      datetime: m.match_datetime || null,
      match_id: m.match_id
    });

    const issues = [
      {
        key: 'unresolved',
        label: 'Matches awaiting resolution',
        severity: 'high',
        help: 'Completed matches whose pending tips have not been paid out yet.',
        action: { label: 'Open in Match Manager', href: '/adminMatches?filter=unresolved' },
        count: unresolved.length,
        capped: unresolved.length >= SAMPLE_LIMIT,
        items: unresolved.map((m) => ({
          text: `${m.t1 || '?'} vs ${m.t2 || '?'}`,
          sub: `${m.pending_tips} pending tip${Number(m.pending_tips) === 1 ? '' : 's'}`,
          datetime: m.match_datetime || null,
          href: '/adminMatches?filter=unresolved'
        }))
      },
      {
        key: 'unmapped',
        label: 'Matches with unmapped teams',
        severity: 'high',
        help: 'A team name from the sync is not linked to a team, so tips on it cannot resolve. Add an alias to fix.',
        action: { label: 'Open Team Alias Manager', href: '/adminAliases' },
        count: unmapped.length,
        capped: unmapped.length >= SAMPLE_LIMIT,
        items: unmapped.map((m) => {
          const missing = [];
          if (!m.team_1_id) missing.push(m.source_team_1_name || '(team 1)');
          if (!m.team_2_id) missing.push(m.source_team_2_name || '(team 2)');
          return {
            text: `${m.source_team_1_name || '?'} vs ${m.source_team_2_name || '?'}`,
            sub: 'Unmatched: ' + missing.join(', '),
            datetime: m.match_datetime || null,
            href: '/adminMatches?filter=all&search=' + encodeURIComponent(m.source_team_1_name || '')
          };
        })
      },
      {
        key: 'missingOdds',
        label: 'Upcoming matches missing odds',
        severity: 'medium',
        help: 'These are tippable soon but have no odds yet. Odds usually fill from the odds sync once teams are rated.',
        action: { label: 'Open in Match Manager', href: '/adminMatches?filter=upcoming' },
        count: missingOdds.length,
        capped: missingOdds.length >= SAMPLE_LIMIT,
        items: missingOdds.map(fmtMatch).map((m) => ({ ...m, href: '/adminMatches?filter=upcoming' }))
      },
      {
        key: 'missingDate',
        label: 'Upcoming matches with no date',
        severity: 'medium',
        help: 'Tipping stays closed until a match has a scheduled time.',
        action: { label: 'Open in Match Manager', href: '/adminMatches?filter=upcoming' },
        count: missingDate.length,
        capped: missingDate.length >= SAMPLE_LIMIT,
        items: missingDate.map((m) => ({
          text: `${m.t1 || '?'} vs ${m.t2 || '?'}`,
          sub: 'No scheduled time',
          datetime: null,
          href: '/adminMatches?filter=upcoming'
        }))
      },
      {
        key: 'unknownRegion',
        label: 'Teams with unknown region',
        severity: 'low',
        help: 'These active teams have no region set, so they are hidden from the Teams pages.',
        action: { label: 'Open Team Manager', href: '/adminTeams' },
        count: unknownRegion.length,
        capped: unknownRegion.length >= SAMPLE_LIMIT,
        items: unknownRegion.map((t) => ({
          text: t.name,
          sub: 'Region: ' + (t.region === null || t.region === '' ? '(empty)' : t.region),
          datetime: null,
          href: '/adminTeams'
        }))
      }
    ];

    res.json({ success: true, summary, issues });
  } catch (err) {
    console.error('Admin health error:', err);
    res.status(500).json({ success: false, error: 'Failed to load health data.' });
  }
});

module.exports = router;
