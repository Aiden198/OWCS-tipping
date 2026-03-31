var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Unable to log out');
    }

    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;