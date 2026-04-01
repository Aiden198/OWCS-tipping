const matchModel = require('../models/matchModel');
const { normalizeTeamName } = require('./teamAliasMap');
const { getTeamIcon } = require('./teamIconMap');

exports.normalizeMatch = async (rawMatch) => {
  const normalizedTeam1Name = normalizeTeamName(rawMatch.source_team_1_name);
  const normalizedTeam2Name = normalizeTeamName(rawMatch.source_team_2_name);

  const team1 = await matchModel.findTeamByName(normalizedTeam1Name);
  const team2 = await matchModel.findTeamByName(normalizedTeam2Name);

    return {
    source_id: rawMatch.source_id,
    source_url: rawMatch.source_url,
    team_1_id: team1 ? team1.team_id : null,
    team_2_id: team2 ? team2.team_id : null,
    source_team_1_name: rawMatch.source_team_1_name,
    source_team_2_name: rawMatch.source_team_2_name,
    match_datetime: rawMatch.match_datetime,
    stage: rawMatch.stage,
    region: rawMatch.region,
    status: rawMatch.status,
    completed: rawMatch.status === 'completed',
    team_1_score: rawMatch.team_1_score,
    team_2_score: rawMatch.team_2_score,
    winning_team_id: winningTeamId,
    last_synced_at: new Date()
    };
};