const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { startMatchSyncScheduler, runFullSyncCycle } = require('./jobs/matchSyncScheduler');

// Session Middleware
const sessionMiddleware = require('./middlewares/session');
const isAuthenticated = require('./middlewares/auth');
const isAdmin = require('./middlewares/isAdmin');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var accountRouter = require('./routes/account');
var adminRouter = require('./routes/admin');
var leaderboardRouter = require('./routes/leaderboard');
var loginRouter = require('./routes/login');
var fixturesRouter = require('./routes/fixtures');
var tipsRouter = require('./routes/tips');
var rulesRouter = require('./routes/rules');
var resultsRouter = require('./routes/results');
var teamsRouter = require('./routes/teams');
var aboutRouter = require('./routes/about');
var contactRouter = require('./routes/contact');
var disclaimerRouter = require('./routes/disclaimer');
var privacyRouter = require('./routes/privacy');
var termsRouter = require('./routes/terms');
var donateRouter = require('./routes/donate');

// api routes
const adminApiRouter = require('./routes/api/admin');
const loginApiRouter = require('./routes/api/login');
const logoutApiRouter = require('./routes/api/logout');
const signupApiRouter = require('./routes/api/signup');
const accountApiRouter = require('./routes/api/account');
const tipsApiRouter = require('./routes/api/tips');
var matchesApiRouter = require('./routes/api/matches');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessionMiddleware);

const db = require('./db');

app.use(async (req, res, next) => {
  try {
    if (!req.session.user) {
      res.locals.user = null;
      return next();
    }

    const [rows] = await db.query(
      `
      SELECT user_id, username, email, is_admin, credits
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.session.user.userID]
    );

    if (rows.length === 0) {
      req.session.destroy(() => {});
      res.locals.user = null;
      return next();
    }

    req.session.user = {
      userID: rows[0].user_id,
      username: rows[0].username,
      email: rows[0].email,
      is_admin: rows[0].is_admin,
      credits: rows[0].credits
    };

    res.locals.user = req.session.user;
    next();
  } catch (err) {
    console.error('Session user refresh error:', err);
    res.locals.user = req.session.user || null;
    next();
  }
});

app.use('/api/admin', adminRouter);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/account', accountRouter);
app.use('/admin', adminRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/login', loginRouter);
app.use('/fixtures', fixturesRouter);
app.use('/tips', tipsRouter);
app.use('/rules', rulesRouter);
app.use('/results', resultsRouter);
app.use('/teams', teamsRouter);
app.use('/about', aboutRouter);
app.use('/contact', contactRouter);
app.use('/disclaimer', disclaimerRouter);
app.use('/privacy', privacyRouter);
app.use('/terms', termsRouter);
app.use('/donate', donateRouter);

//api mounts
app.use('/api/admin', adminApiRouter);
app.use('/api/login', loginApiRouter);
app.use('/api/logout', logoutApiRouter);
app.use('/api/signup', signupApiRouter);
app.use('/api/account', accountApiRouter);
app.use('/api/tips', tipsApiRouter);
app.use('/api/matches', matchesApiRouter);

//runFullSyncCycle();
startMatchSyncScheduler();

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
