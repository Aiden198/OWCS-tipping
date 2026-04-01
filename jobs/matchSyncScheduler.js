const cron = require('node-cron');
const syncMatchesJob = require('./syncMatchesJob');
const resolveAllMatches = require('../services/resolveAllMatches');
const { updateUpcomingMatchOdds } = require('../services/oddsService');

async function runFullSyncCycle() {
  console.log('[Scheduler] Running match sync...');

  try {
    const syncResult = await syncMatchesJob.runScheduleSync();
    console.log('[Scheduler] Match sync success:', syncResult);

    console.log('[Scheduler] Updating odds...');
    const oddsResult = await updateUpcomingMatchOdds();
    console.log('[Scheduler] Odds update success:', oddsResult);

    console.log('[Scheduler] Resolving completed matches...');
    const resolveResult = await resolveAllMatches();
    console.log('[Scheduler] Resolve success:', resolveResult);
  } catch (err) {
    console.error('[Scheduler] Cycle failed:', err);
  }
}

function startMatchSyncScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    await runFullSyncCycle();
  });

  console.log('[Scheduler] Started (every 5 minutes)');
}

module.exports = {
  startMatchSyncScheduler,
  runFullSyncCycle
};