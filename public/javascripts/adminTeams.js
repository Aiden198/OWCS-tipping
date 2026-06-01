const teamsTableBody = document.getElementById('teamsTableBody');
const statusMessage = document.getElementById('statusMessage');
const teamSearch = document.getElementById('teamSearch');

let allTeams = [];
const teamCount = document.getElementById('teamCount');

function showMessage(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError ? 'error-message' : 'success-message';
}

async function loadTeams() {
  const res = await fetch('/api/admin/teams', {
    credentials: 'include'
  });

  const data = await res.json();

  if (!data.success) {
    showMessage(data.error || 'Failed to load teams.', true);
    return;
  }

  allTeams = data.teams;
  renderTeams(allTeams);
}

function renderTeams(teams) {
  teamsTableBody.innerHTML = '';

  teamCount.textContent = `Showing ${teams.length} of ${allTeams.length} teams`;

  let currentRegion = null;

  teams.forEach(team => {
    if (team.region !== currentRegion) {
      currentRegion = team.region;

      const regionRow = document.createElement('tr');
      regionRow.classList.add('region-separator-row');

      regionRow.innerHTML = `
        <td colspan="10">${currentRegion}</td>
      `;

      teamsTableBody.appendChild(regionRow);
    }

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${team.team_id}</td>

      <td>
        <input class="team-input" data-field="icon_path" value="${team.icon_path || ''}">
        <img class="team-icon-preview" src="${team.icon_path || ''}" alt="${team.name || ''}">
      </td>

      <td>
        <input class="team-input" data-field="name" value="${team.name || ''}">
      </td>

      <td>
        <input class="team-input small" data-field="abbreviation" value="${team.abbreviation || ''}">
      </td>

      <td>
        <input class="team-input small" data-field="region" value="${team.region || ''}">
      </td>

      <td>
        <input class="team-input small" type="number" data-field="rating" value="${team.rating}">
      </td>

      <td>
        <input type="checkbox" data-field="active" ${team.active ? 'checked' : ''}>
      </td>

      <td>
        <input class="team-input" data-field="slug" value="${team.slug || ''}">
      </td>

      <td>
        <input class="team-input" data-field="liquipedia_slug" value="${team.liquipedia_slug || ''}">
      </td>

      <td>
        <button class="save-team-btn">Save</button>
      </td>
    `;

    row.querySelector('.save-team-btn').addEventListener('click', () => {
      saveTeam(team.team_id, row);
    });

    teamsTableBody.appendChild(row);
  });
}

function filterTeams() {
  const search = teamSearch.value.trim().toLowerCase();

  if (!search) {
    renderTeams(allTeams);
    return;
  }

  const filteredTeams = allTeams.filter(team => {
    return [
      team.name,
      team.abbreviation,
      team.slug,
      team.region,
      team.icon_path,
      team.liquipedia_slug,
      team.liquipedia_url,
      String(team.rating),
      String(team.team_id)
    ]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(search));
  });

  renderTeams(filteredTeams);
}

async function saveTeam(teamId, row) {
  const body = {};

  row.querySelectorAll('[data-field]').forEach(input => {
    const field = input.dataset.field;

    if (input.type === 'checkbox') {
      body[field] = input.checked;
    } else {
      body[field] = input.value.trim();
    }
  });

  const res = await fetch(`/api/admin/teams/${teamId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!data.success) {
    showMessage(data.error || 'Failed to save team.', true);
    return;
  }

  showMessage('Team saved successfully.');

  await loadTeams();

  filterTeams();
}

teamSearch.addEventListener('input', filterTeams);

loadTeams();