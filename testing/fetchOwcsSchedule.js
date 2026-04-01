const owcsScheduleService = require('../services/owcsScheduleService');

async function run() {
  try {
    const matches = await owcsScheduleService.fetchSchedule();
    console.log(`Fetched ${matches.length} matches`);
    console.table(matches.slice(0, 20));
  } catch (err) {
    console.error('Error fetching OWCS schedule:', err);
  }
}

run();