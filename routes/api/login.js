const bcrypt = require("bcrypt");
const db = require("../../database/db");
var express = require('express');
var router = express.Router();

router.post('/', async function (req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).send("Login information required.");
  }

  try {
    const [result] = await db.promise().query('SELECT * FROM user WHERE email = ?', [email]);

    if (result.length == 0) {
      return res.status(401).send("Invalid email or password");
    }

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      console.log(`Login attempt: ${email} incorrect password`);
      return res.status(401).send("Invalid email or password");
    }

    console.log(`Login attempt: ${email} successful`);

    req.session.regenerate(function (err) {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).send('Internal Server Error');
      }

      req.session.user = {
        userID: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        is_admin: user.is_admin
      };

      res.status(200).json({
        userID: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        is_admin: user.is_admin
      });
    });

  } catch (err) {
    console.error("Database Error", err);
    return res.status(500).send("Database error");
  }
});

module.exports = router;
