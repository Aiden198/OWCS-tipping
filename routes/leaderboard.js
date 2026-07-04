var express = require('express');
var router = express.Router();
const db = require('../db');

/*
  Leaderboard boards:
    - alltime : ranked by total credits (wallet + outstanding pending stakes)
    - weekly  : ranked by net profit from tips resolved in the last 7 days
    - stage   : ranked by net profit from tips on a chosen competition/stage
    - accuracy: ranked by lifetime tip accuracy (min settled tips)

  Net profit for a settled tip:
    won  ->  amount_tipped * (odds - 1)
    lost -> -amount_tipped
*/

const VALID_BOARDS = ['alltime', 'weekly', 'stage', 'accuracy'];
const ACCURACY_MIN_TIPS = 10;

const NET_PROFIT_SQL = `
  COALESCE(SUM(
    CASE
      WHEN t.status = 'won'  THEN t.amount_tipped * (t.odds - 1)
      WHEN t.status = 'lost' THEN -t.amount_tipped
      ELSE 0
    END
  ), 0)
`;

const SETTLED_SQL = `
  SUM(CASE WHEN t.status IN ('won', 'lost') THEN 1 ELSE 0 END)
`;

// Builds the list of year+stage buckets (regions condensed into one entry each).
// e.g. all "2026 ... Stage 2 ..." competitions across NA/EMEA/etc. -> one "2026 Stage 2".
async function getStageBuckets() {
  const [rows] = await db.query(`
    SELECT
      c.competition_id,
      c.season_year,
      c.stage_number,
      c.stage_type
    FROM competitions c
    JOIN matches m ON m.competition_id = c.competition_id
    GROUP BY c.competition_id, c.season_year, c.stage_number, c.stage_type
  `);

  const buckets = new Map();

  for (const r of rows) {
    let key;
    let label;
    let sortStage;

    if (r.stage_number !== null && r.stage_number !== undefined) {
      key = `y${r.season_year}s${r.stage_number}`;
      label = `${r.season_year} Stage ${r.stage_number}`;
      sortStage = Number(r.stage_number);
    } else {
      // Competitions without a stage number (World Cup, Midseason, etc.)
      const typeLabel = String(r.stage_type || 'Event')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      key = `y${r.season_year}t${r.stage_type || 'event'}`;
      label = `${r.season_year} ${typeLabel}`;
      sortStage = -1;
    }

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label,
        year: Number(r.season_year),
        sortStage,
        competitionIds: []
      });
    }
    buckets.get(key).competitionIds.push(r.competition_id);
  }

  return [...buckets.values()].sort(
    (a, b) => b.year - a.year || b.sortStage - a.sortStage || a.label.localeCompare(b.label)
  );
}

// Returns the full ordered list of entries for a given board (no LIMIT).
// For the stage board, stageArg is an array of competition_ids to include.
async function getBoardEntries(board, stageArg) {
  if (board === 'alltime') {
    const [rows] = await db.query(`
      SELECT
        u.user_id,
        u.username,
        u.badge_type,
        (
          u.credits + COALESCE(SUM(
            CASE WHEN t.status = 'pending' THEN t.amount_tipped ELSE 0 END
          ), 0)
        ) AS total_credits
      FROM users u
      LEFT JOIN tips t ON u.user_id = t.user_id
      GROUP BY u.user_id, u.username, u.badge_type, u.credits
      ORDER BY total_credits DESC, u.user_id ASC
    `);

    return rows.map((r) => ({
      user_id: r.user_id,
      username: r.username,
      badge_type: r.badge_type,
      primary: Number(r.total_credits),
      settled: null
    }));
  }

  if (board === 'weekly') {
    const [rows] = await db.query(`
      SELECT
        u.user_id,
        u.username,
        u.badge_type,
        ${NET_PROFIT_SQL} AS net_profit,
        ${SETTLED_SQL} AS settled_tips
      FROM users u
      JOIN tips t ON u.user_id = t.user_id
      WHERE t.status IN ('won', 'lost')
        AND t.resolved_at IS NOT NULL
        AND t.resolved_at >= (NOW() - INTERVAL 7 DAY)
      GROUP BY u.user_id, u.username, u.badge_type
      HAVING settled_tips > 0
      ORDER BY net_profit DESC, settled_tips DESC, u.user_id ASC
    `);

    return rows.map((r) => ({
      user_id: r.user_id,
      username: r.username,
      badge_type: r.badge_type,
      primary: Number(r.net_profit),
      settled: Number(r.settled_tips)
    }));
  }

  if (board === 'stage') {
    // stageArg is an array of competition_ids that make up one year+stage bucket.
    if (!Array.isArray(stageArg) || stageArg.length === 0) return [];

    const [rows] = await db.query(`
      SELECT
        u.user_id,
        u.username,
        u.badge_type,
        ${NET_PROFIT_SQL} AS net_profit,
        ${SETTLED_SQL} AS settled_tips
      FROM users u
      JOIN tips t ON u.user_id = t.user_id
      JOIN matches m ON t.match_id = m.match_id
      WHERE t.status IN ('won', 'lost')
        AND m.competition_id IN (?)
      GROUP BY u.user_id, u.username, u.badge_type
      HAVING settled_tips > 0
      ORDER BY net_profit DESC, settled_tips DESC, u.user_id ASC
    `, [stageArg]);

    return rows.map((r) => ({
      user_id: r.user_id,
      username: r.username,
      badge_type: r.badge_type,
      primary: Number(r.net_profit),
      settled: Number(r.settled_tips)
    }));
  }

  // accuracy
  const [rows] = await db.query(`
    SELECT
      u.user_id,
      u.username,
      u.badge_type,
      SUM(CASE WHEN t.status = 'won' THEN 1 ELSE 0 END) AS wins,
      ${SETTLED_SQL} AS settled_tips
    FROM users u
    JOIN tips t ON u.user_id = t.user_id
    WHERE t.status IN ('won', 'lost')
    GROUP BY u.user_id, u.username, u.badge_type
    HAVING settled_tips >= ${ACCURACY_MIN_TIPS}
    ORDER BY (wins / settled_tips) DESC, settled_tips DESC, u.user_id ASC
  `);

  return rows.map((r) => {
    const wins = Number(r.wins);
    const settled = Number(r.settled_tips);
    return {
      user_id: r.user_id,
      username: r.username,
      badge_type: r.badge_type,
      primary: settled > 0 ? (wins / settled) * 100 : 0,
      wins,
      settled
    };
  });
}

router.get('/', async function (req, res) {
  try {
    let board = String(req.query.board || 'alltime').toLowerCase();
    if (!VALID_BOARDS.includes(board)) board = 'alltime';

    // Year+stage buckets (regions condensed) for the stage board.
    const stageBuckets = board === 'stage' ? await getStageBuckets() : [];

    let selectedStage = null;
    let selectedCompetitionIds = null;
    if (board === 'stage') {
      const requested = String(req.query.stage || '');
      const bucket = stageBuckets.find((b) => b.key === requested) || stageBuckets[0] || null;
      if (bucket) {
        selectedStage = bucket.key;
        selectedCompetitionIds = bucket.competitionIds;
      }
    }

    // View only needs key + label for the dropdown.
    const stages = stageBuckets.map((b) => ({ key: b.key, label: b.label }));

    const allEntries = await getBoardEntries(board, selectedCompetitionIds);

    const topUsers = allEntries.slice(0, 50).map((e, index) => ({
      ...e,
      rank: index + 1
    }));

    let currentUserRank = null;
    if (req.session.user) {
      const currentUserId = Number(req.session.user.userID);
      const foundIndex = allEntries.findIndex((e) => Number(e.user_id) === currentUserId);
      if (foundIndex !== -1) {
        currentUserRank = { ...allEntries[foundIndex], rank: foundIndex + 1 };
      }
    }

    res.render('leaderboard', {
      board,
      topUsers,
      currentUserRank,
      stages,
      selectedStage,
      accuracyMinTips: ACCURACY_MIN_TIPS
    });
  } catch (err) {
    console.error('Leaderboard page error:', err);
    res.status(500).send('Error loading leaderboard');
  }
});

module.exports = router;
