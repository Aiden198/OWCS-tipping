const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  const [drafts] = await db.query(`
    SELECT *
    FROM news_items
    WHERE status = 'draft'
    ORDER BY created_at DESC
  `);

  const [published] = await db.query(`
    SELECT *
    FROM news_items
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT 20
  `);

  res.render('adminNews', { drafts, published });
});

router.post('/:id/publish', isAuthenticated, isAdmin, async (req, res) => {
  await db.query(`
    UPDATE news_items
    SET status = 'published',
        published_at = NOW()
    WHERE news_id = ?
  `, [req.params.id]);

  res.redirect('/adminNews');
});

router.post('/:id/ignore', isAuthenticated, isAdmin, async (req, res) => {
  await db.query(`
    UPDATE news_items
    SET status = 'ignored'
    WHERE news_id = ?
  `, [req.params.id]);

  res.redirect('/adminNews');
});

router.post('/:id/update', isAuthenticated, isAdmin, async (req, res) => {
  const { title, body, image_url } = req.body;

  await db.query(`
    UPDATE news_items
    SET title = ?,
        body = ?,
        image_url = ?
    WHERE news_id = ?
  `, [title, body, image_url, req.params.id]);

  res.redirect('/adminNews');
});

router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  const { type, title, body, source_url, image_url, status } = req.body;

  await db.query(`
    INSERT INTO news_items (
      type,
      title,
      body,
      source_url,
      image_url,
      status,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ${status === 'published' ? 'NOW()' : 'NULL'})
  `, [
    type || 'manual',
    title,
    body,
    source_url || null,
    image_url || null,
    status === 'published' ? 'published' : 'draft'
  ]);

  res.redirect('/adminNews');
});

router.post('/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  await db.query(`
    DELETE FROM news_items
    WHERE news_id = ?
  `, [req.params.id]);

  res.redirect('/adminNews');
});

module.exports = router;