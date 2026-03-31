const teams = require("./teams");

function getAllTeams() {
  return teams;
}

function getActiveTeams() {
  return teams.filter((team) => team.active);
}

function getTeamById(id) {
  return teams.find((team) => team.id === id) || null;
}

function getTeamsByRegion(region) {
  return teams.filter(
    (team) => team.region.toUpperCase() === region.toUpperCase()
  );
}

function getTeamByAbbreviation(abbreviation) {
  return (
    teams.find(
      (team) =>
        team.abbreviation &&
        team.abbreviation.toUpperCase() === abbreviation.toUpperCase()
    ) || null
  );
}

module.exports = {
  getAllTeams,
  getActiveTeams,
  getTeamById,
  getTeamsByRegion,
  getTeamByAbbreviation
};