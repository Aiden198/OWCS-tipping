const db = require('../db');

function winProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 100));
}

function decimalOdds(probability, margin = 0.05) {
  const fairOdds = 1 / probability;
  return Number((fairOdds * (1 - margin)).toFixed(2));
}

async function updateUpcomingMatchOdds() {
  const [matches] = await db.query(`
    SELECT
      m.match_id,
      t1.rating AS team_1_rating,
      t2.rating AS team_2_rating
    FROM matches m
    JOIN teams t1 ON m.team_1_id = t1.team_id
    JOIN teams t2 ON m.team_2_id = t2.team_id
    WHERE m.status = 'upcoming'
  `);

  let updated = 0;

  for (const match of matches) {
    const p1 = winProbability(match.team_1_rating, match.team_2_rating);
    const p2 = 1 - p1;

    const team1Odds = decimalOdds(p1);
    const team2Odds = decimalOdds(p2);

    await db.query(`
      UPDATE matches
      SET team_1_odds = ?, team_2_odds = ?
      WHERE match_id = ?
    `, [team1Odds, team2Odds, match.match_id]);

    updated++;
  }

  return {
    totalMatchesChecked: matches.length,
    totalUpdated: updated
  };
}

module.exports = {
  winProbability,
  decimalOdds,
  updateUpcomingMatchOdds
};