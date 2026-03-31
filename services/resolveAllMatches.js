const db = require("../database/db");
const resolveMatch = require("./resolveMatch");

async function resolveAllMatches() {
  try {
    const [matches] = await db.promise().query(`
      SELECT match_id
      FROM matches
      WHERE completed = TRUE
        AND resolved = FALSE
      ORDER BY match_datetime ASC
    `);

    const results = [];

    for (const match of matches) {
      try {
        const result = await resolveMatch(match.match_id);
        results.push({
          match_id: match.match_id,
          success: true,
          message: result.message,
          resolvedTips: result.resolvedTips
        });
      } catch (err) {
        results.push({
          match_id: match.match_id,
          success: false,
          message: err.message
        });
      }
    }

    return {
      totalMatchesChecked: matches.length,
      totalResolved: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results
    };
  } catch (err) {
    throw err;
  }
}

module.exports = resolveAllMatches;