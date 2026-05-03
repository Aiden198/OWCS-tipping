const cron = require('node-cron');
const syncMatchesJob = require('./syncMatchesJob');
const resolveAllMatches = require('../services/resolveAllMatches');
const { updateUpcomingMatchOdds } = require('../services/oddsService');
const db = require('../db');

async function cleanupOldMatches() {
  console.log('[Scheduler] Cleaning up old matches...');

  try {
    const [result] = await db.query(`
      DELETE FROM matches
      WHERE match_datetime < DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND completed = TRUE
        AND resolved = TRUE
    `);

    console.log(`[Scheduler] Cleanup success: deleted ${result.affectedRows} old matches.`);
    return result;
  } catch (err) {
    console.error('[Scheduler] Cleanup failed:', err);
    throw err;
  }
}

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
  cron.schedule('*/15 * * * *', async () => {
    await runFullSyncCycle();
  });

  cron.schedule('0 3 * * *', async () => {
    await cleanupOldMatches();
  });

  console.log('[Scheduler] Started match sync every 15 minutes');
  console.log('[Scheduler] Started cleanup once per day at 3am');
}

module.exports = {
  startMatchSyncScheduler,
  runFullSyncCycle,
  cleanupOldMatches
};