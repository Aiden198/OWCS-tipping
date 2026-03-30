var express = require('express');
var router = express.Router();

router.post('/', function (req, res) {
    if (!req.session || !req.session.user) {
        return res.status(401).send("Not logged in");
    }

    let email = req.session.user.email;

    req.session.destroy((err) => {
        if (err) {
            console.error(`Error logging out ${email}.`, err);
            return res.status(500).send("Error logging out");
        }
        console.log(`${email} logged out.`);
        res.send("Logged out successfully");
    });
});

module.exports = router;