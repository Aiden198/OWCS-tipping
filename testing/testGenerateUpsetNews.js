const generateUpsetNews = require('../services/news/generateUpsetNews');

async function run() {
  try {
    const result = await generateUpsetNews();
    console.log('Generated upset news:');
    console.log(result);
    process.exit(0);
  } catch (err) {
    console.error('Failed to generate upset news:');
    console.error(err);
    process.exit(1);
  }
}

run();