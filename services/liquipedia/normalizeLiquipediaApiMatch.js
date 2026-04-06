function normalizeLiquipediaApiMatch(apiMatch, competitionMeta) {
  const opponents = apiMatch.match2opponents || [];

  const team1 = opponents[0] || null;
  const team2 = opponents[1] || null;

  if (!team1 || !team2 || !team1.name || !team2.name) {
    return null;
  }

  function normalizeScore(score) {
    if (score === null || score === undefined) return null;

    const numeric = Number(score);

    if (Number.isNaN(numeric)) return null;
    if (numeric < 0) return null;

    return numeric;
  }

  const team1Score = normalizeScore(team1.score);
  const team2Score = normalizeScore(team2.score);

  const finished = Number(apiMatch.finished) === 1;

  const status = finished ? 'completed' : 'upcoming';

  let winningTeamSide = null;
  if (apiMatch.winner === '1' || apiMatch.winner === 1) {
    winningTeamSide = 1;
  } else if (apiMatch.winner === '2' || apiMatch.winner === 2) {
    winningTeamSide = 2;
  }

  return {
    competition_source_key: competitionMeta.source_key,
    source_page: apiMatch.pagename
      ? `https://liquipedia.net/overwatch/${apiMatch.pagename}`
      : competitionMeta.source_page,
    source_match_key: `liquipedia:${apiMatch.match2id}`,
    source_team_1_name: team1.name,
    source_team_2_name: team2.name,
    match_datetime: apiMatch.date,
    round_label: null,
    match_format: apiMatch.bestof ? `Bo${apiMatch.bestof}` : null,
    status,
    team_1_score: team1Score,
    team_2_score: team2Score,
    completed: finished,
    winning_team_side: winningTeamSide
  };
}

module.exports = normalizeLiquipediaApiMatch;