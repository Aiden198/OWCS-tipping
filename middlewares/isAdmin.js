function isAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).send('Not authenticated');
    }

    if (req.session.user.is_admin) {
        return next();
    } else {
        return res.status(403).send('Access denied: Admins only');
    }
}

module.exports = isAdmin;
