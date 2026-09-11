const db = require('../../db');

async function getSourcePages() {
  const [rows] = await db.query('SELECT url FROM source_pages ORDER BY source_page_id ASC');
  return rows.map((row) => row.url);
}

module.exports = getSourcePages;
