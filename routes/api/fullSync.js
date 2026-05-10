// routes/api/admin/fullSync.js

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

const isAuthenticated = require('../../middlewares/auth');
const isAdmin = require('../../middlewares/isAdmin');

const scripts = [
  'testingLiquipediaSync.js',
  'updateOdds.js',
  'resolveAllTest.js'
];

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'testing', scriptName);

    const child = spawn('node', [scriptPath], {
      shell: true
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', data => {
      output += data.toString();
    });

    child.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    child.on('close', code => {
      if (code === 0) {
        resolve(`\n=== ${scriptName} completed ===\n${output}`);
      } else {
        reject(new Error(`\n=== ${scriptName} failed ===\n${errorOutput || output}`));
      }
    });
  });
}

router.post('/', isAuthenticated, isAdmin, async function (req, res) {
  try {
    const results = [];

    for (const script of scripts) {
      results.push(await runScript(script));
    }

    res.json({
      success: true,
      message: 'Full sync completed successfully.',
      output: results.join('\n')
    });
  } catch (err) {
    console.error('Full sync failed:', err);

    res.status(500).json({
      success: false,
      message: 'Full sync failed.',
      error: err.message
    });
  }
});

module.exports = router;