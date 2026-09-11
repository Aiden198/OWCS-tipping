const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/adminSourcePages', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminSourcePages');
});

router.get('/api/admin/source-pages', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT source_page_id, url, label, created_at
      FROM source_pages
      ORDER BY source_page_id ASC
    `);

    res.json({ success: true, pages });
  } catch (err) {
    console.error('Failed to fetch source pages:', err);
    res.status(500).json({ success: false, error: 'Failed to load source pages.' });
  }
});

router.post('/api/admin/source-pages', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const url = String(req.body.url || '').trim();
    const label = String(req.body.label || '').trim() || null;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required.' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'That is not a valid URL.' });
    }

    await db.query('INSERT INTO source_pages (url, label) VALUES (?, ?)', [url, label]);

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'That source page is already in the list.' });
    }
    console.error('Failed to add source page:', err);
    res.status(500).json({ success: false, error: 'Failed to add source page.' });
  }
});

router.delete('/api/admin/source-pages/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id.' });
    }

    await db.query('DELETE FROM source_pages WHERE source_page_id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete source page:', err);
    res.status(500).json({ success: false, error: 'Failed to delete source page.' });
  }
});

module.exports = router;
