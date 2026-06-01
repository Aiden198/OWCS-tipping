const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/adminTeams', isAuthenticated, isAdmin, async (req, res) => {
  res.render('adminTeams');
});

router.get('/api/admin/teams', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [teams] = await db.query(`
      SELECT
        team_id,
        slug,
        name,
        abbreviation,
        region,
        icon_path,
        liquipedia_url,
        liquipedia_slug,
        active,
        rating,
        created_at,
        updated_at
      FROM teams
      ORDER BY region, active DESC, rating DESC, name
    `);

    res.json({ success: true, teams });
  } catch (err) {
    console.error('Failed to fetch teams:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch teams.' });
  }
});

router.put('/api/admin/teams/:teamId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;

    const {
      slug,
      name,
      abbreviation,
      region,
      icon_path,
      liquipedia_url,
      liquipedia_slug,
      active,
      rating
    } = req.body;

    await db.query(
      `
        UPDATE teams
        SET
          slug = ?,
          name = ?,
          abbreviation = ?,
          region = ?,
          icon_path = ?,
          liquipedia_url = ?,
          liquipedia_slug = ?,
          active = ?,
          rating = ?
        WHERE team_id = ?
      `,
      [
        slug,
        name,
        abbreviation || null,
        region,
        icon_path,
        liquipedia_url || null,
        liquipedia_slug || null,
        active ? 1 : 0,
        Number(rating),
        teamId
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update team:', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'That slug, name, or abbreviation is already being used by another team.'
      });
    }

    res.status(500).json({ success: false, error: 'Failed to update team.' });
  }
});

module.exports = router;