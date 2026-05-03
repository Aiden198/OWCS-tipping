/*
NEWS ITEM FORMAT GUIDE

Each news item should follow this structure:

{
  title: 'Short headline',
  category: 'Tag shown at top (e.g. Tournament, Result, Update)',
  date: 'YYYY-MM-DD',  // Keep consistent format
  summary: '1–2 sentence description of the news item.',
  linkText: 'Optional button text (e.g. View Results)',
  linkUrl: '/optional-link'
}

Notes:
- You can remove linkText + linkUrl if not needed
- Keep summaries short so cards stay clean
- Newest items should go at the TOP of the array
*/

const newsItems = [
  {
    title: 'World Cup Starting Soon',
    category: 'Tournament',
    date: '2026-05-04',
    summary: 'The Overwatch World Cup (OWWC) is starting soon, with with the Regional group stage kicking off on the 29th of may. Closer to this date the matches will be available to tip on in the fixtures page.',
    linkText: 'View fixtures',
    linkUrl: '/fixtures'
  },
  {
    title: 'Zeta Division Win Korea',
    category: 'Regional Result',
    date: '2026-05-03',
    summary: 'Zeta Division secured the Korea region title after a strong playoff run, winning 4 - 1 against Team Falcons.',
    linkText: 'View results',
    linkUrl: '/results'
  },
    {
    title: 'Asia region begginning group stage',
    category: 'Tournament',
    date: '2026-05-04',
    summary: 'The Asia region of the Overwatch World Cup is kicking off, with Japan, Korea and Pacific teams facing off in the group stage on May 5th and 6th. Then the playoffs will be held on May 9th and 10th. Closer to these dates the matches will be available to tip on in the fixtures page.',
    linkText: 'View fixtures',
    linkUrl: '/fixtures'
    },
    {
    title: 'Champions Clash',
    category: 'Tournament',
    date: '2026-05-04',
    summary: 'The Champions Clash LAN event in Japan is set to begin on Friday the 22nd of May, with the top teams from around the world competing for the title.',
    linkText: 'View fixtures',
    linkUrl: '/fixtures'
  }
];

module.exports = newsItems;