const axios = require('axios');
const cheerio = require('cheerio');

const SCHEDULE_URL = 'https://esports.overwatch.com/en-us/schedule';

function toMysqlDatetime(isoString) {
  const d = new Date(isoString);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;
}

function extractBalancedArray(text, key) {
  const startIndex = text.indexOf(key);
  if (startIndex === -1) return null;

  const arrayStart = text.indexOf('[', startIndex);
  if (arrayStart === -1) return null;

  let bracketCount = 0;
  let endIndex = -1;

  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === '[') bracketCount++;
    if (text[i] === ']') bracketCount--;

    if (bracketCount === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) return null;

  return text.slice(arrayStart, endIndex + 1);
}

function inferRegion(team1, team2) {
  const emeaTeams = [
    'Virtus.Pro',
    'Twisted Minds',
    'Geekay Esports',
    'Qadsiah',
    'Team Peps',
    'LuneX',
    'Anyones Legend'
  ];

  if (emeaTeams.includes(team1) || emeaTeams.includes(team2)) {
    return 'EMEA';
  }

  return 'NA';
}

exports.fetchSchedule = async () => {
  const response = await axios.get(SCHEDULE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const $ = cheerio.load(response.data);

  const matches = [];

  $('script').each((i, el) => {
    const content = $(el).html() || '';

    if (!content.includes('airtableMatches')) return;

    try {
      const stringMatch = content.match(/self\.__next_f\.push\(\[\d+,\s*"([\s\S]*)"\]\)/);
      if (!stringMatch) return;

      const decodedPayload = JSON.parse(`"${stringMatch[1]}"`);

      const jsonText = extractBalancedArray(decodedPayload, '"airtableMatches":');
      if (!jsonText) return;

      const data = JSON.parse(jsonText);

      data.forEach(block => {
        if (!block.matches || !Array.isArray(block.matches)) return;

        block.matches.forEach(m => {
          const f = m.fields || {};

          const team1 = f.team1Name?.[0];
          const team2 = f.team2Name?.[0];

          if (!team1 || !team2 || !f.datetime || !f.matchId) return;

          const stageName = String(f['Stage Name'] || '').trim();
          const eventName = String(f.event || '').trim();

          // Only keep real OWCS Stage 1 matches
          if (stageName !== 'Stage 1' || eventName !== 'Regular Season') {
            return;
          }

          let status = String(f.matchStatus || '').toLowerCase();
          if (status === 'pending') status = 'upcoming';
          if (status === 'in_progress') status = 'live';

          const rawScore1 = f['Team 1 Score'];
          const rawScore2 = f['Team 2 Score'];

          const team1Score = status === 'upcoming' ? null : (rawScore1 ?? null);
          const team2Score = status === 'upcoming' ? null : (rawScore2 ?? null);

          matches.push({
            source_id: f.matchId,
            source_url: SCHEDULE_URL,
            source_team_1_name: team1,
            source_team_2_name: team2,
            match_datetime: toMysqlDatetime(f.datetime),
            stage: stageName,
            region: inferRegion(team1, team2),
            status,
            team_1_score: team1Score,
            team_2_score: team2Score
          });
        });
      });
    } catch (err) {
      console.log(`Parse error in script ${i}:`, err.message);
    }
  });

  const map = new Map();
  matches.forEach(m => map.set(m.source_id, m));

  return Array.from(map.values());
};