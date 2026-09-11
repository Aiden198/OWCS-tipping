const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/data/uploads'
  : path.join(__dirname, '../public/uploads');

const ICON_MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const teamIconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = ICON_MIME_EXT[file.mimetype];
    if (!ext) return cb(new Error('Unsupported image type. Use PNG, JPG, WEBP or GIF.'));

    const teamId = req.params.teamId;

    try {
      fs.readdirSync(UPLOAD_DIR)
        .filter((existing) => existing.startsWith(`team_${teamId}.`))
        .forEach((existing) => fs.unlinkSync(path.join(UPLOAD_DIR, existing)));
    } catch (err) {
      console.error('Failed to clean up old team icon files:', err);
    }

    cb(null, `team_${teamId}${ext}`);
  }
});

const teamIconUpload = multer({
  storage: teamIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ICON_MIME_EXT[file.mimetype]) {
      return cb(new Error('Unsupported image type. Use PNG, JPG, WEBP or GIF.'));
    }
    cb(null, true);
  }
});

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

router.post('/api/admin/teams/:teamId/icon', isAuthenticated, isAdmin, (req, res) => {
  teamIconUpload.single('icon')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const iconPath = `/uploads/${req.file.filename}`;

    try {
      await db.query('UPDATE teams SET icon_path = ? WHERE team_id = ?', [iconPath, req.params.teamId]);
      res.json({ success: true, icon_path: iconPath });
    } catch (dbErr) {
      console.error('Failed to save team icon path:', dbErr);
      res.status(500).json({ success: false, error: 'Failed to save icon.' });
    }
  });
});

module.exports = router;