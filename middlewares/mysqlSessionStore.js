const { Store } = require('express-session');

const PRUNE_INTERVAL_MS = 1000 * 60 * 60; // hourly
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 1 day, mirrors express-session's own default

class MySQLSessionStore extends Store {
  constructor(db) {
    super();
    this.db = db;

    this.pruneTimer = setInterval(() => {
      this.db.query('DELETE FROM sessions WHERE expires < ?', [Math.floor(Date.now() / 1000)])
        .catch((err) => console.error('Session prune error:', err));
    }, PRUNE_INTERVAL_MS);
    this.pruneTimer.unref();
  }

  expiresFor(session) {
    const expiresAt = session.cookie && session.cookie.expires
      ? new Date(session.cookie.expires).getTime()
      : Date.now() + DEFAULT_TTL_MS;

    return Math.floor(expiresAt / 1000);
  }

  async get(sid, callback) {
    try {
      const [rows] = await this.db.query(
        'SELECT data, expires FROM sessions WHERE session_id = ?',
        [sid]
      );

      if (!rows.length) return callback(null, null);

      const row = rows[0];
      if (row.expires < Math.floor(Date.now() / 1000)) {
        await this.db.query('DELETE FROM sessions WHERE session_id = ?', [sid]);
        return callback(null, null);
      }

      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      await this.db.query(
        `INSERT INTO sessions (session_id, expires, data)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
        [sid, this.expiresFor(session), JSON.stringify(session)]
      );
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.db.query('DELETE FROM sessions WHERE session_id = ?', [sid]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
      await this.db.query(
        'UPDATE sessions SET expires = ? WHERE session_id = ?',
        [this.expiresFor(session), sid]
      );
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = MySQLSessionStore;
