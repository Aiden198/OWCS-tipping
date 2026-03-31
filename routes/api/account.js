const db = require('../../db');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const isAuthenticated = require('../../middlewares/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');

const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);

/* =========================
   ACCOUNT UPDATE
========================= */

router.put('/', isAuthenticated, async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).send("Not authenticated");
  }

  const { firstname, lastname, email, password } = req.body;
  const userId = req.session.user.userID;

  if (!firstname || !lastname || !email || !password) {
    return res.status(400).send("Missing fields");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE users SET firstname = ?, lastname = ?, email = ?, password = ? WHERE user_id = ?',
      [firstname, lastname, email, hashedPassword, userId]
    );

    req.session.user.firstname = firstname;
    req.session.user.lastname = lastname;
    req.session.user.email = email;

    res.send("Account updated");
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send("Internal error");
  }
});

/* =========================
   PROFILE PICTURE UPLOAD
========================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.session.user?.userID;
    if (!userId) return cb(new Error('User not authenticated'), '');

    const filename = `user_${userId}.png`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

router.post('/profile-pic', isAuthenticated, upload.single('profilePic'), async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).send("Not authenticated");
  }

  const userId = req.session.user.userID;

  if (!userId) {
    return res.status(401).send('No user id');
  }

  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const targetFilename = `user_${userId}.png`;

  try {
    await db.query(
      'UPDATE users SET profile_pic = ? WHERE user_id = ?',
      [targetFilename, userId]
    );

    req.session.user.profile_pic = targetFilename;

    res.status(200).send('Profile picture updated');
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    res.status(500).send('Failed to process image');
  }
});

/* =========================
   GET CURRENT ACCOUNT
========================= */

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT firstname, lastname, email, profile_pic, is_admin, credits
      FROM users
      WHERE user_id = ?
      `,
      [req.session.user.userID]
    );

    if (!rows.length) {
      return res.status(404).send('User not found');
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;