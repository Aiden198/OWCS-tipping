const matchModel = require('../models/matchModel');
const syncMatchesJob = require('../jobs/syncMatchesJob');

exports.getAllMatches = async (req, res) => {
  try {
    const matches = await matchModel.getAllMatches();
    res.json(matches);
  } catch (err) {
    console.error('Error getting all matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

exports.getLiveMatches = async (req, res) => {
  try {
    const matches = await matchModel.getMatchesByStatus('live');
    res.json(matches);
  } catch (err) {
    console.error('Error getting live matches:', err);
    res.status(500).json({ error: 'Failed to fetch live matches' });
  }
};

exports.getUpcomingMatches = async (req, res) => {
  try {
    const matches = await matchModel.getMatchesByStatus('upcoming');
    res.json(matches);
  } catch (err) {
    console.error('Error getting upcoming matches:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
};

exports.getCompletedMatches = async (req, res) => {
  try {
    const matches = await matchModel.getMatchesByStatus('completed');
    res.json(matches);
  } catch (err) {
    console.error('Error getting completed matches:', err);
    res.status(500).json({ error: 'Failed to fetch completed matches' });
  }
};

exports.syncMatchesNow = async (req, res) => {
  try {
    const result = await syncMatchesJob.runScheduleSync();

    res.json({
      success: true,
      message: 'Schedule sync completed successfully',
      result
    });
  } catch (err) {
    console.error('Error syncing matches:', err);
    console.error('Error message:', err.message);
    console.error('SQL message:', err.sqlMessage);
    console.error('SQL code:', err.code);

    res.status(500).json({
      error: 'Failed to sync matches'
    });
  }
};