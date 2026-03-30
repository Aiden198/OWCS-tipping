var express = require('express');
var router = express.Router();
const isAuthenticated = require('../middlewares/auth');

router.get('/', isAuthenticated, (req, res) => {
    res.render('account', {
        user: req.session.user
    });
});

module.exports = router;