const matchModel = require('../models/matchModel');
const owcsScheduleService = require('../services/owcsScheduleService');
const matchNormalizer = require('../services/matchNormalizer');

exports.runScheduleSync = async () => {
  const rawMatches = await owcsScheduleService.fetchSchedule();

  let inserted = 0;
  let updated = 0;

  for (const rawMatch of rawMatches) {
    const normalizedMatch = await matchNormalizer.normalizeMatch(rawMatch);
    const result = await matchModel.upsertMatch(normalizedMatch);

    if (result === 'inserted') inserted++;
    if (result === 'updated') updated++;
  }

  return {
    total: rawMatches.length,
    inserted,
    updated
  };
};