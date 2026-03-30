const db = require('../../database/db');


const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const isAuthenticated = require('../../middlewares/auth');

router.put('/', isAuthenticated, async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).send("Not authenticated");
    }

    const { firstname, lastname, email, password } = req.body;
    const userId = req.session.user.user_id;

    if (!firstname || !lastname || !email || !password) {
        return res.status(400).send("Missing fields");
    }

    try {
        // Hash password
        let hashedPassword = await bcrypt.hash(password, 10);

        await db.promise().query(
            'UPDATE user SET firstname = ?, lastname = ?, email = ?, password = ? WHERE user_id = ?',
            [firstname, lastname, email, hashedPassword, userId]
        );

        // Update session
        req.session.user.firstname = firstname;
        req.session.user.lastname = lastname;
        req.session.user.email = email;

        res.send("Account updated");
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).send("Internal error");
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.session.user?.user_id;
    if (!userId) return cb(new Error('User not authenticated'), '');

    const filename = `user_${userId}.png`;

    // Remove old file if it exists
    const fullPath = path.join(__dirname, '../../public/uploads', filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    cb(null, filename);
  }
});


const upload = multer({ storage });


const util = require('util');
const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);

router.post('/profile-pic', isAuthenticated, upload.single('profilePic'), async (req, res) => {
    console.log("Session at profile-pic upload:", req.session);

    if (!req.session || !req.session.user) {
        return res.status(401).send("Not authenticated");
    }

    const userId = req.session.user.userID;

    if (!userId) return res.status(401).send('Not user id');

    const tempPath = req.file.path;
    const targetFilename = `user_${userId}.png`;
    const targetPath = path.join(__dirname, '../../public/uploads', targetFilename);

    try {
        // Delete previous image if exists
        if (fs.existsSync(targetPath)) {
        await unlink(targetPath);
        }

        // Rename uploaded file
        await rename(tempPath, targetPath);

        // Update DB
        await db.promise().query(
            'UPDATE user SET profile_pic = ? WHERE user_id = ?',
            [targetFilename, userId]
        );

        // Update session
        req.session.user.profile_pic = targetFilename;

        res.status(200).send('Profile picture updated');
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).send('Failed to process image');
    }
});



router.get('/', isAuthenticated, async (req, res) => {
  console.log("Session at account get:", req.session);
  try {
    const [rows] = await db.promise().query(
    'SELECT firstname, lastname, email, profile_pic, is_admin FROM user WHERE user_id = ?',
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