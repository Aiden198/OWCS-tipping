async function fetchMatches(endpoint) {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }

  return response.json();
}

function formatMatchTime(datetimeString) {
  const date = new Date(datetimeString);

  return date.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function createTeamBlock(name, iconPath, score) {
  return `
    <div class="match-card__team">
      <img
        class="match-card__team-icon"
        src="${iconPath || '/images/OWCS_icon.png'}"
        alt="${name}"
      />
      <div class="match-card__team-info">
        <div class="match-card__team-name">${name}</div>
      </div>
      <div class="match-card__team-score">
        ${score === null || score === undefined ? '' : score}
      </div>
    </div>
  `;
}

function createMatchCard(match) {
  return `
    <article class="match-card">
      <div class="match-card__meta">
        <span class="match-card__stage">${match.stage || ''}</span>
        <span class="match-card__region">${match.region || ''}</span>
        <span class="match-card__status match-card__status--${match.status}">
          ${match.status}
        </span>
      </div>

      <div class="match-card__time">
        ${formatMatchTime(match.match_datetime)}
      </div>

      <div class="match-card__teams">
        ${createTeamBlock(match.team_1_name, match.team_1_icon, match.team_1_score)}
        ${createTeamBlock(match.team_2_name, match.team_2_icon, match.team_2_score)}
      </div>
    </article>
  `;
}

function renderMatches(containerId, matches) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = '<p class="matches-empty">No matches found.</p>';
    return;
  }

  container.innerHTML = matches.map(createMatchCard).join('');
}

async function loadMatches() {
  try {
    const [upcoming, live, completed] = await Promise.all([
      fetchMatches('/api/matches/upcoming'),
      fetchMatches('/api/matches/live'),
      fetchMatches('/api/matches/completed')
    ]);

    renderMatches('upcoming-matches', upcoming);
    renderMatches('live-matches', live);
    renderMatches('completed-matches', completed);
  } catch (err) {
    console.error('Error loading matches:', err);

    renderMatches('upcoming-matches', []);
    renderMatches('live-matches', []);
    renderMatches('completed-matches', []);
  }
}

document.addEventListener('DOMContentLoaded', loadMatches);