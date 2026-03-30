var express = require('express');
var router = express.Router();
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

router.get('/', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin', {
        user: req.session.user
    });
});

module.exports = router;