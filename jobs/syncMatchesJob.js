const upsertLiquipediaMatches = require('../services/liquipedia/upsertLiquipediaMatches');

exports.runScheduleSync = async () => {
  const summary = await upsertLiquipediaMatches();

  return {
    total: summary.matchesFound,
    inserted: summary.inserted,
    updated: summary.updated,
    skipped: summary.skipped,
    pages: summary.pages,
    competitions: summary.competitions,
    unmatchedTeams: summary.unmatchedTeams
  };
};