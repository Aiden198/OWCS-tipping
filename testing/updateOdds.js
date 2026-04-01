const { updateUpcomingMatchOdds } = require('../services/oddsService');

updateUpcomingMatchOdds()
  .then((result) => {
    console.log('Odds update result:');
    console.dir(result, { depth: null });
    process.exit(0);
  })
  .catch((err) => {
    console.error('Odds update error:', err);
    process.exit(1);
  });