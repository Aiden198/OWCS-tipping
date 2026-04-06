const express = require("express");
const router = express.Router();
const db = require("../db");

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

        res.render("index", { featuredMatches, user: req.session.user || null });
      } catch (err) {
        next(err);
      }
    });

module.exports = router;