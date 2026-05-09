const express = require('express');
const router = express.Router();

let cachedToken = null;
let tokenExpiresAt = 0;

async function getTwitchToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST'
  });

  if (!res.ok) {
    throw new Error('Failed to get Twitch token');
  }

  const data = await res.json();

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

router.get('/live', async (req, res) => {
  try {
    const token = await getTwitchToken();

    const params = new URLSearchParams();
    params.append('user_login', 'ow_esports');
    params.append('user_login', 'ow_esports_jp');

    const twitchRes = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`
      }
    });

    if (!twitchRes.ok) {
      throw new Error('Failed to fetch Twitch streams');
    }

    const data = await twitchRes.json();

    const streams = data.data.map(stream => ({
      channel: stream.user_login,
      channelName: stream.user_name,
      title: stream.title,
      viewerCount: stream.viewer_count,
      thumbnailUrl: stream.thumbnail_url
        .replace('{width}', '640')
        .replace('{height}', '360'),
      url: `https://www.twitch.tv/${stream.user_login}`
    }));

    res.json(streams);
  } catch (err) {
    console.error('Twitch live check error:', err);
    res.status(500).json([]);
  }
});

module.exports = router;