const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

const VALID_BADGES = ['', 'owner', 'vip'];
const DEFAULT_TOPUP_TARGET = 500;

// ---- Page ----
router.get('/adminUsers', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminUsers', { currentUserId: req.session.user.userID });
});

// ---- List / search users ----
router.get('/api/admin/users/list', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const params = [];
    let where = '1=1';
    if (search) {
      where = '(username LIKE ? OR email LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    const [users] = await db.query(`
      SELECT
        user_id,
        username,
        email,
        credits,
        is_admin,
        badge_type,
        tips_won,
        tips_lost,
        current_tip_streak,
        best_tip_streak,
        created_at
      FROM users
      WHERE ${where}
      ORDER BY user_id ASC
      LIMIT 500
    `, params);

    res.json({ success: true, users });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ success: false, error: 'Failed to load users.' });
  }
});

// ---- Set / adjust credits ----
router.post('/api/admin/users/:id/credits', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id.' });
    }

    const mode = String(req.body.mode || 'set');
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount)) {
      return res.status(400).json({ success: false, error: 'Amount must be a number.' });
    }
    if (mode !== 'set' && mode !== 'adjust') {
      return res.status(400).json({ success: false, error: 'Invalid mode.' });
    }
    if (mode === 'set' && amount < 0) {
      return res.status(400).json({ success: false, error: 'Credits cannot be negative.' });
    }

    if (mode === 'set') {
      await db.query('UPDATE users SET credits = ? WHERE user_id = ?', [amount, userId]);
    } else {
      // Never let a balance go below zero.
      await db.query('UPDATE users SET credits = GREATEST(0, credits + ?) WHERE user_id = ?', [amount, userId]);
    }

    const [[row]] = await db.query('SELECT credits FROM users WHERE user_id = ?', [userId]);
    if (!row) return res.status(404).json({ success: false, error: 'User not found.' });

    res.json({ success: true, credits: Number(row.credits) });
  } catch (err) {
    console.error('Admin credits update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update credits.' });
  }
});

// ---- Grant / revoke admin ----
router.post('/api/admin/users/:id/admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id.' });
    }
    const makeAdmin = req.body.is_admin ? 1 : 0;

    // Prevent an admin from removing their own admin rights (lock-out safety).
    if (Number(userId) === Number(req.session.user.userID) && makeAdmin === 0) {
      return res.status(400).json({ success: false, error: 'You cannot remove your own admin access.' });
    }

    await db.query('UPDATE users SET is_admin = ? WHERE user_id = ?', [makeAdmin, userId]);
    res.json({ success: true, is_admin: makeAdmin });
  } catch (err) {
    console.error('Admin toggle error:', err);
    res.status(500).json({ success: false, error: 'Failed to update admin status.' });
  }
});

// ---- Set badge ----
router.post('/api/admin/users/:id/badge', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id.' });
    }
    const badge = String(req.body.badge_type || '');
    if (!VALID_BADGES.includes(badge)) {
      return res.status(400).json({ success: false, error: 'Invalid badge type.' });
    }

    await db.query('UPDATE users SET badge_type = ? WHERE user_id = ?', [badge || null, userId]);
    res.json({ success: true, badge_type: badge || null });
  } catch (err) {
    console.error('Admin badge error:', err);
    res.status(500).json({ success: false, error: 'Failed to update badge.' });
  }
});

// ---- Reset password ----
router.post('/api/admin/users/:id/password', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user id.' });
    }
    const password = String(req.body.password || '');
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin password reset error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// ---- Top up low balances (the credit refill function, as a button) ----
router.post('/api/admin/users/topup', isAuthenticated, isAdmin, async (req, res) => {
  try {
    let target = Number(req.body.target);
    if (!Number.isFinite(target) || target <= 0) target = DEFAULT_TOPUP_TARGET;

    const [result] = await db.query(
      'UPDATE users SET credits = ? WHERE credits < ?',
      [target, target]
    );

    res.json({
      success: true,
      target,
      toppedUp: result.affectedRows
    });
  } catch (err) {
    console.error('Admin top-up error:', err);
    res.status(500).json({ success: false, error: 'Failed to top up balances.' });
  }
});

module.exports = router;
