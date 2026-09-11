const tableBody = document.getElementById('sp-table-body');
const countEl = document.getElementById('sp-count');
const addMsg = document.getElementById('sp-add-msg');
const addUrlInput = document.getElementById('sp-add-url');
const addLabelInput = document.getElementById('sp-add-label');
const addBtn = document.getElementById('sp-add-btn');

function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
}

async function api(method, url, body) {
  const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

function renderRows(pages) {
  countEl.textContent = `${pages.length} source page${pages.length === 1 ? '' : 's'}`;

  if (!pages.length) {
    tableBody.innerHTML = '<tr><td colspan="4">No source pages yet. Add one above.</td></tr>';
    return;
  }

  tableBody.innerHTML = pages.map((page) => `
    <tr data-id="${page.source_page_id}">
      <td>${esc(page.label) || '<span class="sp-muted">&mdash;</span>'}</td>
      <td class="sp-url-cell"><a href="${esc(page.url)}" target="_blank" rel="noopener">${esc(page.url)}</a></td>
      <td>${formatDate(page.created_at)}</td>
      <td><button class="btn btn-danger sp-delete-btn" data-id="${page.source_page_id}">Remove</button></td>
    </tr>
  `).join('');
}

async function loadSourcePages() {
  try {
    const data = await api('GET', '/api/admin/source-pages');
    renderRows(data.pages || []);
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = '<tr><td colspan="4">Failed to load source pages.</td></tr>';
  }
}

addBtn.addEventListener('click', async () => {
  const url = addUrlInput.value.trim();
  const label = addLabelInput.value.trim();

  if (!url) {
    addMsg.textContent = 'Enter a URL.';
    addMsg.className = 'sp-msg sp-msg--error';
    return;
  }

  addMsg.textContent = 'Adding...';
  addMsg.className = 'sp-msg';

  try {
    await api('POST', '/api/admin/source-pages', { url, label });
    addUrlInput.value = '';
    addLabelInput.value = '';
    addMsg.textContent = 'Source page added.';
    addMsg.className = 'sp-msg sp-msg--success';
    await loadSourcePages();
  } catch (err) {
    addMsg.textContent = err.message;
    addMsg.className = 'sp-msg sp-msg--error';
  }
});

tableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.sp-delete-btn');
  if (!btn) return;

  if (!confirm('Remove this source page? Future syncs will stop pulling matches from it.')) return;

  try {
    await api('DELETE', `/api/admin/source-pages/${btn.dataset.id}`);
    await loadSourcePages();
  } catch (err) {
    alert(err.message);
  }
});

loadSourcePages();
