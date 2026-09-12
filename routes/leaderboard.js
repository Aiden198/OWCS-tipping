var express = require('express');
var router = express.Router();
const {
  VALID_BOARDS,
  ACCURACY_MIN_TIPS,
  getStageBuckets,
  getBoardEntries
} = require('../services/leaderboardService');

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
