const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const resolveMatch = require('../services/resolveMatch');

const VALID_STATUSES = ['upcoming', 'live', 'completed'];

// ---- Page ----
router.get('/adminMatches', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminMatches');
});

// ---- List matches (filter + search) ----
router.get('/api/admin/matches', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const filter = String(req.query.filter || 'unresolved').toLowerCase();
    const search = req.query.search ? String(req.query.search).trim() : '';

    let where = '1=1';
    if (filter === 'upcoming') where = "m.status = 'upcoming'";
    else if (filter === 'unresolved') where = 'm.completed = 1 AND m.resolved = 0';
    else if (filter === 'resolved') where = 'm.resolved = 1';
    else if (filter === 'completed') where = 'm.completed = 1';
    // 'all' -> 1=1

    const params = [];
    let searchClause = '';
    if (search) {
      searchClause = `
        AND (
          t1.name LIKE ? OR t2.name LIKE ?
          OR m.source_team_1_name LIKE ? OR m.source_team_2_name LIKE ?
        )`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const [matches] = await db.query(`
      SELECT
        m.match_id,
        m.match_datetime,
        m.status,
        m.completed,
        m.resolved,
        m.round_label,
        m.match_format,
        m.team_1_id,
        m.team_2_id,
        m.team_1_score,
        m.team_2_score,
        m.team_1_odds,
        m.team_2_odds,
        m.winning_team_id,
        m.last_synced_at,
        c.title AS competition_title,
        c.competition_region,
        c.stage_number,
        COALESCE(t1.name, m.source_team_1_name) AS team_1_name,
        COALESCE(t2.name, m.source_team_2_name) AS team_2_name,
        t1.abbreviation AS team_1_abbr,
        t2.abbreviation AS team_2_abbr,
        (SELECT COUNT(*) FROM tips tp WHERE tp.match_id = m.match_id) AS tip_count,
        (SELECT COUNT(*) FROM tips tp WHERE tp.match_id = m.match_id AND tp.status = 'pending') AS pending_tip_count
      FROM matches m
      LEFT JOIN competitions c ON m.competition_id = c.competition_id
      LEFT JOIN teams t1 ON m.team_1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE ${where} ${searchClause}
      ORDER BY
        CASE WHEN m.match_datetime IS NULL THEN 1 ELSE 0 END,
        m.match_datetime DESC
      LIMIT 300
    `, params);

    res.json({ success: true, matches });
  } catch (err) {
    console.error('Admin matches list error:', err);
    res.status(500).json({ success: false, error: 'Failed to load matches.' });
  }
});

// ---- Update a match (odds/time/format always; scores/winner/status only if unresolved) ----
router.put('/api/admin/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId)) {
      return res.status(400).json({ success: false, error: 'Invalid match id.' });
    }

    const [rows] = await db.query('SELECT * FROM matches WHERE match_id = ? LIMIT 1', [matchId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Match not found.' });
    }
    const match = rows[0];
    const body = req.body || {};

    // Helpers to normalise incoming values, falling back to existing when omitted.
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
    const toNumOrNull = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toIntOrNull = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = parseInt(v, 10);
      return Number.isInteger(n) ? n : null;
    };

    // Metadata (allowed even for resolved matches)
    const matchDatetime = has('match_datetime')
      ? (body.match_datetime ? String(body.match_datetime).replace('T', ' ') : null)
      : match.match_datetime;
    const team1Odds = has('team_1_odds') ? toNumOrNull(body.team_1_odds) : match.team_1_odds;
    const team2Odds = has('team_2_odds') ? toNumOrNull(body.team_2_odds) : match.team_2_odds;
    const matchFormat = has('match_format')
      ? (body.match_format ? String(body.match_format) : null)
      : match.match_format;

    // Result fields (protected once resolved)
    let status = has('status') ? String(body.status).toLowerCase() : match.status;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    let team1Score = has('team_1_score') ? toIntOrNull(body.team_1_score) : match.team_1_score;
    let team2Score = has('team_2_score') ? toIntOrNull(body.team_2_score) : match.team_2_score;
    let winningTeamId = has('winning_team_id') ? toIntOrNull(body.winning_team_id) : match.winning_team_id;

    // Auto-derive winner from scores when not explicitly chosen.
    if (!has('winning_team_id') && team1Score !== null && team2Score !== null && team1Score !== team2Score) {
      winningTeamId = team1Score > team2Score ? match.team_1_id : match.team_2_id;
    }

    // Validate winner belongs to this match.
    if (winningTeamId !== null &&
        Number(winningTeamId) !== Number(match.team_1_id) &&
        Number(winningTeamId) !== Number(match.team_2_id)) {
      return res.status(400).json({ success: false, error: 'Winning team must be one of the two teams in this match.' });
    }

    const completed = status === 'completed' ? 1 : 0;

    // Guard resolved matches: refuse to change result fields (would corrupt payouts/Elo).
    if (match.resolved) {
      const resultChanged =
        Number(team1Score) !== Number(match.team_1_score) ||
        Number(team2Score) !== Number(match.team_2_score) ||
        Number(winningTeamId) !== Number(match.winning_team_id) ||
        status !== match.status;

      if (resultChanged) {
        return res.status(400).json({
          success: false,
          error: 'This match is already resolved. Editing its result would corrupt payouts and ratings. Only odds, time, and format can be changed.'
        });
      }
    }

    await db.query(`
      UPDATE matches
      SET
        match_datetime = ?,
        team_1_odds = ?,
        team_2_odds = ?,
        match_format = ?,
        status = ?,
        completed = ?,
        team_1_score = ?,
        team_2_score = ?,
        winning_team_id = ?
      WHERE match_id = ?
    `, [
      matchDatetime,
      team1Odds,
      team2Odds,
      matchFormat,
      status,
      completed,
      team1Score,
      team2Score,
      winningTeamId,
      matchId
    ]);

    // Optionally resolve immediately (pays out pending tips + Elo).
    let resolveResult = null;
    if (body.resolveNow && !match.resolved && completed && winningTeamId !== null) {
      try {
        resolveResult = await resolveMatch(matchId);
      } catch (resolveErr) {
        return res.json({
          success: true,
          updated: true,
          resolved: false,
          resolveError: resolveErr.message
        });
      }
    }

    res.json({ success: true, updated: true, resolved: !!resolveResult, resolveResult });
  } catch (err) {
    console.error('Admin match update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update match.' });
  }
});

// ---- Resolve a single completed, unresolved match ----
router.post('/api/admin/matches/:matchId/resolve', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId)) {
      return res.status(400).json({ success: false, error: 'Invalid match id.' });
    }

    const result = await resolveMatch(matchId);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Admin resolve error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
