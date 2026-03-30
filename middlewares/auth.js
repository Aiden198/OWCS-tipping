function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  console.log("User not authenticated. Redirect to login page.");
  return res.redirect('/login'); // Redirect to the login page
}

module.exports = isAuthenticated;
