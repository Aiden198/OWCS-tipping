var express = require('express');
var router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');

router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.userID;

    const [[user]] = await db.query(`
      SELECT
        user_id,
        username,
        email,
        credits,
        profile_pic,
        is_admin,
        badge_type,
        tips_won,
        tips_lost,
        current_tip_streak,
        best_tip_streak
      FROM users
      WHERE user_id = ?
    `, [userId]);

    const [[lastMonthStats]] = await db.query(`
      SELECT
        SUM(status = 'won') AS last_month_wins,
        SUM(status = 'lost') AS last_month_losses
      FROM tips
      WHERE user_id = ?
        AND status IN ('won', 'lost')
        AND tip_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `, [userId]);

    const lifetimeWins = Number(user.tips_won || 0);
    const lifetimeLosses = Number(user.tips_lost || 0);
    const lifetimeTotal = lifetimeWins + lifetimeLosses;

    const lastMonthWins = Number(lastMonthStats.last_month_wins || 0);
    const lastMonthLosses = Number(lastMonthStats.last_month_losses || 0);
    const lastMonthTotal = lastMonthWins + lastMonthLosses;

    const profileStats = {
      tipsWon: lifetimeWins,
      tipsLost: lifetimeLosses,
      lifetimeAccuracy: lifetimeTotal > 0
        ? Math.round((lifetimeWins / lifetimeTotal) * 100)
        : 0,
      lastMonthAccuracy: lastMonthTotal > 0
        ? Math.round((lastMonthWins / lastMonthTotal) * 100)
        : 0,
      lastMonthWins,
      lastMonthLosses,
      currentStreak: Number(user.current_tip_streak || 0),
      bestStreak: Number(user.best_tip_streak || 0)
    };

    res.render('account', {
      user,
      profileStats
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;