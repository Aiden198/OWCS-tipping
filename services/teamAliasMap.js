const TEAM_ALIAS_MAP = {
  'Spacestation': 'Space Station Gaming',
  'Spacestation Gaming': 'Space Station Gaming',
  'SSG': 'Space Station Gaming',

  'Virtus.Pro': 'Virtus.pro',
  'Virtus Pro': 'Virtus.pro',

  'Geekay Esports': 'Geekay',
  'Geekay': 'Geekay',

  'LuneX': 'LuneX Gaming',
  'LuneX Gaming': 'LuneX Gaming',

  'Anyones Legend': "Anyone's Legend",
  "Anyone's Legend": "Anyone's Legend",

  'Qadsiah': 'Al Qadsiah',
  'Al Qadsiah': 'Al Qadsiah',

  'Team Liquid': 'Team Liquid',
  'Dallas Fuel': 'Dallas Fuel',
  'Disguised': 'Disguised',
  'Extinction': 'Extinction',
  'Twisted Minds': 'Twisted Minds',
  'Team Peps': 'Team Peps'
};

function normalizeTeamName(sourceName) {
  if (!sourceName) return null;

  return TEAM_ALIAS_MAP[sourceName.trim()] || sourceName.trim();
}

module.exports = {
  TEAM_ALIAS_MAP,
  normalizeTeamName
};