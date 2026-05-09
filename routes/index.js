const express = require("express");
const router = express.Router();
const db = require("../db");

const newsItems = require('../data/newsItems');

router.get("/", async function (req, res, next) {
  try {
    const [rows] = await db.query(`
      SELECT
        m.match_id,
        m.match_datetime,
        t1.name AS team1_name,
        t1.abbreviation AS team1_abbreviation,
        t1.icon_path AS team1_icon,
        t2.name AS team2_name,
        t2.abbreviation AS team2_abbreviation,
        t2.icon_path AS team2_icon
      FROM matches m
      JOIN teams t1 ON m.team_1_id = t1.team_id
      JOIN teams t2 ON m.team_2_id = t2.team_id
      WHERE m.completed = FALSE
        AND m.match_datetime >= NOW()
      ORDER BY m.match_datetime ASC
      LIMIT 3
    `);

    const featuredMatches = rows.map((match) => ({
      match_datetime: match.match_datetime,
      team1: {
        name: match.team1_name,
        abbreviation: match.team1_abbreviation,
        icon: match.team1_icon
      },
      team2: {
        name: match.team2_name,
        abbreviation: match.team2_abbreviation,
        icon: match.team2_icon
      }
    }));

    const [[biggestUpset]] = await db.query(`
      WITH active_override AS (
        SELECT
          uo.match_id,
          uo.created_at
        FROM upset_overrides uo
        WHERE uo.active = TRUE
        ORDER BY uo.created_at DESC
        LIMIT 1
      ),

      upset_candidates AS (
        SELECT
          m.match_id,
          m.match_datetime,
          m.source_url,

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
          END AS loser_odds

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
      ),

      override_candidate AS (
        SELECT uc.*, 1 AS priority
        FROM upset_candidates uc
        JOIN active_override ao
          ON uc.match_id = ao.match_id
      ),

      newer_bigger_candidates AS (
        SELECT uc.*, 2 AS priority
        FROM upset_candidates uc
        JOIN active_override ao
          ON uc.match_datetime > ao.created_at
        WHERE uc.winner_odds > (
          SELECT winner_odds
          FROM upset_candidates
          WHERE match_id = ao.match_id
          LIMIT 1
        )
      ),

      fallback_candidates AS (
        SELECT uc.*, 0 AS priority
        FROM upset_candidates uc
        WHERE NOT EXISTS (
          SELECT 1 FROM active_override
        )
      )

      SELECT *
      FROM (
        SELECT * FROM newer_bigger_candidates
        UNION ALL
        SELECT * FROM override_candidate
        UNION ALL
        SELECT * FROM fallback_candidates
      ) final_candidates
      ORDER BY priority DESC, winner_odds DESC
      LIMIT 1
    `);

    let recentResolvedTips = [];

    if (req.session.user) {
      const [tipRows] = await db.query(`
        SELECT
          tips.tip_id,
          tips.status,
          tips.amount_tipped,
          tips.odds,
          tips.resolved_at,

          m.match_id,
          m.team_1_score,
          m.team_2_score,

          selected.name AS selected_team_name,
          selected.abbreviation AS selected_team_abbreviation,
          selected.icon_path AS selected_team_icon,

          t1.name AS team1_name,
          t1.abbreviation AS team1_abbreviation,
          t1.icon_path AS team1_icon,

          t2.name AS team2_name,
          t2.abbreviation AS team2_abbreviation,
          t2.icon_path AS team2_icon
        FROM tips
        JOIN matches m ON tips.match_id = m.match_id
        JOIN teams selected ON tips.selected_team_id = selected.team_id
        JOIN teams t1 ON m.team_1_id = t1.team_id
        JOIN teams t2 ON m.team_2_id = t2.team_id
        WHERE tips.user_id = ?
          AND tips.status IN ('won', 'lost')
          /* AND tips.resolved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) */
        ORDER BY tips.resolved_at DESC
        LIMIT 3
      `, [req.session.user.userID]);

      recentResolvedTips = tipRows.map(tip => ({
        ...tip,
        payout: tip.status === 'won'
          ? Number(tip.amount_tipped) * Number(tip.odds)
          : 0,
        profit: tip.status === 'won'
          ? Number(tip.amount_tipped) * Number(tip.odds) - Number(tip.amount_tipped)
          : -Number(tip.amount_tipped)
      }));
    }

    const [newsItems] = await db.query(`
      SELECT *
      FROM news_items
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT 12
    `);

        res.render("index", {
          featuredMatches, newsItems, biggestUpset, recentResolvedTips, user: req.session.user || null
        });
      } catch (err) {
        next(err);
      }
    });

module.exports = router;