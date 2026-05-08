const generateMatchResultNews = require('../services/news/generateMatchResultNews');

async function run() {
  try {
    const result = await generateMatchResultNews();

    console.log('Generated match result news:');
    console.log(result);

    process.exit(0);
  } catch (err) {
    console.error('Failed to generate match result news:');
    console.error(err);
    process.exit(1);
  }
}

run();