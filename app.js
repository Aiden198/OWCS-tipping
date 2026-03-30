var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

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
var matchesRouter = require('./routes/matches');

// api routes
const adminApiRouter = require('./routes/api/admin');
const loginApiRouter = require('./routes/api/login');
const logoutApiRouter = require('./routes/api/logout');
const signupApiRouter = require('./routes/api/signup');
const accountApiRouter = require('./routes/api/account');

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
app.use('/api/admin', adminRouter);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/account', accountRouter);
app.use('/admin', adminRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/login', loginRouter);
app.use('/matches', matchesRouter);

//api mounts
app.use('/api/admin', adminApiRouter);
app.use('/api/login', loginApiRouter);
app.use('/api/logout', logoutApiRouter);
app.use('/api/signup', signupApiRouter);
app.use('/api/account', accountApiRouter);

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
