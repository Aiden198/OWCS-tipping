const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');

const ALIAS_SOURCE = 'liquipedia';

// ---- Page ----
router.get('/adminAliases', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminAliases');
});

// ---- Teams + their aliases + usage counts ----
router.get('/api/admin/aliases/data', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [teams] = await db.query(`
      SELECT
        t.team_id,
        t.name,
        t.abbreviation,
        t.region,
        t.active,
        t.rating,
        (SELECT COUNT(*) FROM matches m WHERE m.team_1_id = t.team_id OR m.team_2_id = t.team_id) AS match_count,
        (SELECT COUNT(*) FROM tips tp WHERE tp.selected_team_id = t.team_id) AS tip_count
      FROM teams t
      ORDER BY t.name ASC
    `);

    const [aliases] = await db.query(`
      SELECT alias_id, team_id, source, alias_name
      FROM team_aliases
      ORDER BY alias_name ASC
    `);

    const aliasesByTeam = {};
    aliases.forEach((a) => {
      if (!aliasesByTeam[a.team_id]) aliasesByTeam[a.team_id] = [];
      aliasesByTeam[a.team_id].push(a);
    });

    const shaped = teams.map((t) => ({
      ...t,
      unknown_region: t.region === null || t.region === '' || String(t.region).toLowerCase() === 'unknown',
      aliases: aliasesByTeam[t.team_id] || []
    }));

    res.json({ success: true, teams: shaped });
  } catch (err) {
    console.error('Alias data error:', err);
    res.status(500).json({ success: false, error: 'Failed to load alias data.' });
  }
});

// ---- Add an alias (map a source name to an existing team) ----
router.post('/api/admin/aliases', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const teamId = Number(req.body.team_id);
    const aliasName = String(req.body.alias_name || '').trim();

    if (!Number.isInteger(teamId)) {
      return res.status(400).json({ success: false, error: 'Invalid team.' });
    }
    if (!aliasName) {
      return res.status(400).json({ success: false, error: 'Alias name is required.' });
    }

    const [[team]] = await db.query('SELECT team_id FROM teams WHERE team_id = ?', [teamId]);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    await db.query(
      'INSERT INTO team_aliases (team_id, source, alias_name) VALUES (?, ?, ?)',
      [teamId, ALIAS_SOURCE, aliasName]
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'That alias already exists (it may point to another team).' });
    }
    console.error('Add alias error:', err);
    res.status(500).json({ success: false, error: 'Failed to add alias.' });
  }
});

// ---- Delete an alias ----
router.delete('/api/admin/aliases/:aliasId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const aliasId = Number(req.params.aliasId);
    if (!Number.isInteger(aliasId)) {
      return res.status(400).json({ success: false, error: 'Invalid alias id.' });
    }
    await db.query('DELETE FROM team_aliases WHERE alias_id = ?', [aliasId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete alias error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete alias.' });
  }
});

// ---- Merge one team into another (fixes duplicate / auto-created teams) ----
router.post('/api/admin/aliases/merge', isAuthenticated, isAdmin, async (req, res) => {
  const sourceTeamId = Number(req.body.source_team_id);
  const targetTeamId = Number(req.body.target_team_id);

  if (!Number.isInteger(sourceTeamId) || !Number.isInteger(targetTeamId)) {
    return res.status(400).json({ success: false, error: 'Invalid team ids.' });
  }
  if (sourceTeamId === targetTeamId) {
    return res.status(400).json({ success: false, error: 'Source and target must be different teams.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [[source]] = await connection.query('SELECT team_id, name FROM teams WHERE team_id = ?', [sourceTeamId]);
    const [[target]] = await connection.query('SELECT team_id, name FROM teams WHERE team_id = ?', [targetTeamId]);
    if (!source || !target) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'One or both teams not found.' });
    }

    // Reassign every reference from source -> target.
    const [m1] = await connection.query('UPDATE matches SET team_1_id = ? WHERE team_1_id = ?', [targetTeamId, sourceTeamId]);
    const [m2] = await connection.query('UPDATE matches SET team_2_id = ? WHERE team_2_id = ?', [targetTeamId, sourceTeamId]);
    const [mw] = await connection.query('UPDATE matches SET winning_team_id = ? WHERE winning_team_id = ?', [targetTeamId, sourceTeamId]);
    const [tp] = await connection.query('UPDATE tips SET selected_team_id = ? WHERE selected_team_id = ?', [targetTeamId, sourceTeamId]);

    // Move aliases across (ignore ones that would collide with an existing target alias), then clear leftovers.
    await connection.query('UPDATE IGNORE team_aliases SET team_id = ? WHERE team_id = ?', [targetTeamId, sourceTeamId]);
    await connection.query('DELETE FROM team_aliases WHERE team_id = ?', [sourceTeamId]);

    // Keep the source team's name as an alias of the target so future syncs map correctly.
    await connection.query(
      'INSERT IGNORE INTO team_aliases (team_id, source, alias_name) VALUES (?, ?, ?)',
      [targetTeamId, ALIAS_SOURCE, source.name]
    );

    // Finally remove the now-orphaned source team.
    await connection.query('DELETE FROM teams WHERE team_id = ?', [sourceTeamId]);

    await connection.commit();

    res.json({
      success: true,
      merged: {
        from: source.name,
        into: target.name,
        matchesReassigned: (m1.affectedRows || 0) + (m2.affectedRows || 0),
        winnersReassigned: mw.affectedRows || 0,
        tipsReassigned: tp.affectedRows || 0
      }
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Merge team error:', err);
    res.status(500).json({ success: false, error: 'Failed to merge teams.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
