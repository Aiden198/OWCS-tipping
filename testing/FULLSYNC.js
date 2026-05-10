const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  'testingLiquipediaSync.js',
  'updateOdds.js',
  'resolveAllTest.js'
];

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);

    console.log(`\n=== Running ${scriptName} ===\n`);

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== Finished ${scriptName} ===`);
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAll() {
  try {
    for (const script of scripts) {
      await runScript(script);
    }

    console.log('\n=== Full Sync Complete ===');
    process.exit(0);
  } catch (err) {
    console.error('\n=== Full Sync Failed ===');
    console.error(err);
    process.exit(1);
  }
}

runAll();