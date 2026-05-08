const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    const [upsets] = await db.query(`
      SELECT
        m.match_id,
        m.match_datetime,

        winner.name AS winner_name,
        winner.icon_path AS winner_icon,

        loser.name AS loser_name,
        loser.icon_path AS loser_icon,

        CASE
          WHEN m.winning_team_id = m.team_1_id THEN m.team_1_score
          ELSE m.team_2_score
        END AS winner_score,

        CASE
          WHEN m.winning_team_id = m.team_1_id THEN m.team_2_score
          ELSE m.team_1_score
        END AS loser_score,

        CASE
          WHEN m.winning_team_id = m.team_1_id THEN m.team_1_odds
          ELSE m.team_2_odds
        END AS winner_odds,

        CASE
          WHEN m.winning_team_id = m.team_1_id THEN m.team_2_odds
          ELSE m.team_1_odds
        END AS loser_odds,

        EXISTS (
          SELECT 1
          FROM upset_overrides uo
          WHERE uo.match_id = m.match_id
            AND uo.active = TRUE
        ) AS is_override

      FROM matches m

      JOIN teams winner
        ON winner.team_id = m.winning_team_id

      JOIN teams loser
        ON loser.team_id = CASE
          WHEN m.winning_team_id = m.team_1_id THEN m.team_2_id
          ELSE m.team_1_id
        END

      WHERE m.completed = TRUE
        AND m.winning_team_id IS NOT NULL
        AND m.team_1_score IS NOT NULL
        AND m.team_2_score IS NOT NULL
        AND m.team_1_odds IS NOT NULL
        AND m.team_2_odds IS NOT NULL
        AND m.match_datetime >= DATE_SUB(NOW(), INTERVAL 1 MONTH)

      HAVING winner_odds > loser_odds

      ORDER BY winner_odds DESC, m.match_datetime DESC
    `);

    res.render('adminUpset', { upsets });
  } catch (err) {
    next(err);
  }
});

router.post('/:matchId/override', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    await db.query(`UPDATE upset_overrides SET active = FALSE`);

    await db.query(`
      INSERT INTO upset_overrides (match_id, active)
      VALUES (?, TRUE)
    `, [req.params.matchId]);

    res.redirect('/adminUpset');
  } catch (err) {
    next(err);
  }
});

router.post('/clear', isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    await db.query(`UPDATE upset_overrides SET active = FALSE`);
    res.redirect('/adminUpset');
  } catch (err) {
    next(err);
  }
});

module.exports = router;