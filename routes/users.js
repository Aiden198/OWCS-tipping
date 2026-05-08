var express = require('express');
var router = express.Router();
var db = require('../db');

router.get('/:userId', async function(req, res, next) {
  const userId = req.params.userId;

  try {
    const [userRows] = await db.query(
      `SELECT
          user_id,
          username,
          profile_pic,
          tips_won,
          tips_lost,
          current_tip_streak,
          best_tip_streak
      FROM users
      WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = userRows[0];

    const [activeTips] = await db.query(
      `SELECT
          t.tip_id,
          t.amount_tipped,
          t.odds,
          t.status,
          t.tip_time,
          m.match_id,
          m.match_datetime,
          m.team_1_score,
          m.team_2_score,
          team1.name AS team_1_name,
          team1.abbreviation AS team_1_abbreviation,
          team1.icon_path AS team_1_icon,
          team2.name AS team_2_name,
          team2.abbreviation AS team_2_abbreviation,
          team2.icon_path AS team_2_icon,
          selected.name AS selected_team_name,
          selected.abbreviation AS selected_team_abbreviation
       FROM tips t
       JOIN matches m ON t.match_id = m.match_id
       LEFT JOIN teams team1 ON m.team_1_id = team1.team_id
       LEFT JOIN teams team2 ON m.team_2_id = team2.team_id
       LEFT JOIN teams selected ON t.selected_team_id = selected.team_id
       WHERE t.user_id = ?
         AND t.status = 'pending'
       ORDER BY m.match_datetime ASC`,
      [userId]
    );

    const [pastTips] = await db.query(
      `SELECT
          t.tip_id,
          t.amount_tipped,
          t.odds,
          t.status,
          t.tip_time,
          m.match_id,
          m.match_datetime,
          m.team_1_score,
          m.team_2_score,
          winner.name AS winning_team_name,
          team1.name AS team_1_name,
          team1.abbreviation AS team_1_abbreviation,
          team1.icon_path AS team_1_icon,
          team2.name AS team_2_name,
          team2.abbreviation AS team_2_abbreviation,
          team2.icon_path AS team_2_icon,
          selected.name AS selected_team_name,
          selected.abbreviation AS selected_team_abbreviation
       FROM tips t
       JOIN matches m ON t.match_id = m.match_id
       LEFT JOIN teams team1 ON m.team_1_id = team1.team_id
       LEFT JOIN teams team2 ON m.team_2_id = team2.team_id
       LEFT JOIN teams selected ON t.selected_team_id = selected.team_id
       LEFT JOIN teams winner ON m.winning_team_id = winner.team_id
       WHERE t.user_id = ?
         AND t.status IN ('won', 'lost')
       ORDER BY m.match_datetime DESC`,
      [userId]
    );

    const [[lastMonthStats]] = await db.query(`
      SELECT
        SUM(status = 'won') AS last_month_wins,
        SUM(status = 'lost') AS last_month_losses
      FROM tips
      WHERE user_id = ?
        AND status IN ('won', 'lost')
        AND tip_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `, [user.user_id]);

    const lifetimeWins = Number(user.tips_won || 0);
    const lifetimeLosses = Number(user.tips_lost || 0);
    const lifetimeTotal = lifetimeWins + lifetimeLosses;

    const lastMonthWins = Number(lastMonthStats.last_month_wins || 0);
    const lastMonthLosses = Number(lastMonthStats.last_month_losses || 0);
    const lastMonthTotal = lastMonthWins + lastMonthLosses;

    const viewedUserStats = {
      tipsWon: lifetimeWins,
      tipsLost: lifetimeLosses,
      lifetimeAccuracy: lifetimeTotal > 0 ? Math.round((lifetimeWins / lifetimeTotal) * 100) : 0,
      lastMonthAccuracy: lastMonthTotal > 0 ? Math.round((lastMonthWins / lastMonthTotal) * 100) : 0,
      lastMonthWins,
      lastMonthLosses,
      currentStreak: Number(user.current_tip_streak || 0),
      bestStreak: Number(user.best_tip_streak || 0)
    };

    res.render('userTips', {
      viewedUser: user,
      activeTips,
      viewedUserStats,
      pastTips
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;