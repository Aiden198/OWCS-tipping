const TEAM_ICON_MAP = {
  'Al Qadsiah': '/images/team_icons/al_qadsiah_icon.png',
  'Anyones Legend': "/images/team_icons/anyone's_legend_icon.png",
  'Dallas Fuel': '/images/team_icons/dallas_fuel_icon.webp',
  'Disguised': '/images/team_icons/disguised_icon.png',
  'Extinction': '/images/team_icons/extinction_icon.png',
  'Geekay Esports': '/images/team_icons/geekay_icon.png',
  'Geekay': '/images/team_icons/geekay_icon.png',
  'LuneX Gaming': '/images/team_icons/lunex_gaming_icon.png',
  'LuneX': '/images/team_icons/lunex_gaming_icon.png',
  'Spacestation': '/images/team_icons/SSG_icon.png',
  'Spacestation Gaming': '/images/team_icons/SSG_icon.png',
  'SSG': '/images/team_icons/SSG_icon.png',
  'Team Liquid': '/images/team_icons/team_liquid_icon.png',
  'Team Peps': '/images/team_icons/team_peps_icon.png',
  'Twisted Minds': '/images/team_icons/twisted_minds_icon.png',
  'Virtus.Pro': '/images/team_icons/virtus.pro_icon.png',
  'Virtus Pro': '/images/team_icons/virtus.pro_icon.png'
};

function getTeamIcon(teamName) {
  if (!teamName) return null;
  return TEAM_ICON_MAP[teamName] || null;
}

module.exports = {
  TEAM_ICON_MAP,
  getTeamIcon
};