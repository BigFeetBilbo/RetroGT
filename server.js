
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Proxy endpoint for RAWG console image
app.get('/console-image', async (req, res) => {
  const title = req.query.title;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  // RAWG API key
  const RAWG_KEY = 'db8d54702d2b41a2bc05d57af5a6e6e4';
  async function getRawgConsoleImage(searchTitle) {
    const url = `https://api.rawg.io/api/platforms?key=${RAWG_KEY}&search=${encodeURIComponent(searchTitle)}`;
    console.log('RAWG console search URL:', url);
    const resp = await axios.get(url);
    const results = resp.data && resp.data.results;
    if (!results || results.length === 0) return null;
    // Prefer image_background (platform art)
    let imgUrl = results[0].image_background || null;
    // If still no image, try to find any .jpg in the result fields
    if (!imgUrl) {
      for (const platform of results) {
        if (platform.image_background && platform.image_background.endsWith('.jpg')) {
          imgUrl = platform.image_background;
          break;
        }
      }
    }
    console.log('RAWG console image URL:', imgUrl);
    return imgUrl;
  }
  try {
    let imgUrl = await getRawgConsoleImage(title);
    res.json({ image: imgUrl });
  } catch (e) {
    res.json({ image: null });
  }
});
const http = require('http');
require('dotenv').config();

// (already declared above)

// Proxy image endpoint to avoid CORS/mixed content issues
app.get('/image-proxy', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  const client = url.startsWith('https') ? https : http;
  client.get(url, (imgRes) => {
    res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    imgRes.pipe(res);
  }).on('error', () => res.status(500).send('Image fetch error'));
});
// Proxy endpoint for ScreenScraper game image
app.get('/game-image', async (req, res) => {
  const title = req.query.title;
  const consoleName = req.query.console;
  if (!title) return res.status(400).json({ error: 'Missing title' });
  // RAWG API key
  const RAWG_KEY = 'db8d54702d2b41a2bc05d57af5a6e6e4';
  async function getRawgImage(searchTitle) {
    const url = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(searchTitle)}`;
    console.log('RAWG search URL:', url);
    const resp = await axios.get(url);
    const results = resp.data && resp.data.results;
    if (!results || results.length === 0) return null;
    // Prefer background_image (box art), fallback to screenshots if available
    let imgUrl = results[0].background_image || null;
    if (!imgUrl && results[0].short_screenshots && results[0].short_screenshots.length > 0) {
      imgUrl = results[0].short_screenshots[0].image;
    }
    // If still no image, try to find any .jpg in the result fields
    if (!imgUrl) {
      for (const game of results) {
        if (game.background_image && game.background_image.endsWith('.jpg')) {
          imgUrl = game.background_image;
          break;
        }
        if (game.short_screenshots) {
          for (const ss of game.short_screenshots) {
            if (ss.image && ss.image.endsWith('.jpg')) {
              imgUrl = ss.image;
              break;
            }
          }
        }
        if (imgUrl) break;
      }
    }
    console.log('RAWG image URL:', imgUrl);
    return imgUrl;
  }
  try {
    let imgUrl = await getRawgImage(title);
    res.json({ image: imgUrl });
  } catch (e) {
    res.json({ image: null });
  }
});




// Read all data
defaultData = JSON.parse(fs.readFileSync('db.json', 'utf8'));

// Get all games
app.get('/games', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  res.json(data.games);
});

// Get all consoles
app.get('/consoles', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  res.json(data.consoles);
});

// Add a new game
app.post('/games', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  const newGame = req.body;
  newGame.id = data.games.length ? data.games[data.games.length-1].id + 1 : 1;
  data.games.push(newGame);
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

  // Generate HTML for the new game using the template
  try {
    const templatePath = __dirname + '/Games/template.html';
    let template = fs.readFileSync(templatePath, 'utf8');
    // Replace placeholders
    template = template.replace(/\{\{title\}\}/g, newGame.title)
                     .replace(/\{\{console\}\}/g, newGame.console)
                     .replace(/\{\{id\}\}/g, newGame.id);
    // Sanitize filename
    const fileName = newGame.title.replace(/[^a-zA-Z0-9]+/g, '_') + '.html';
    const filePath = __dirname + '/Games/' + fileName;
    fs.writeFileSync(filePath, template);
  } catch (err) {
    console.error('Failed to create game HTML:', err);
  }

  res.status(201).json(newGame);
});

// Add a new console
// Remove a game by id
app.delete('/games/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  const gameId = parseInt(req.params.id);
  const idx = data.games.findIndex(g => g.id === gameId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Game not found' });
  }
  // Remove game from array
  const [removedGame] = data.games.splice(idx, 1);
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
  // Try to remove the generated HTML file
  try {
    const fileName = removedGame.title.replace(/[^a-zA-Z0-9]+/g, '_') + '.html';
    const filePath = __dirname + '/Games/' + fileName;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to delete game HTML:', err);
  }
  res.json({ success: true });
});

app.post('/consoles', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  const newConsole = req.body;
  newConsole.id = data.consoles.length ? data.consoles[data.consoles.length-1].id + 1 : 1;
  data.consoles.push(newConsole);
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));

  // Generate HTML for the new console using the template
  try {
    const templatePath = __dirname + '/Consoles/template.html';
    let template = fs.readFileSync(templatePath, 'utf8');
    // Replace placeholders
    template = template.replace(/\{\{name\}\}/g, newConsole.name)
                     .replace(/\{\{id\}\}/g, newConsole.id);
    // Sanitize filename
    const fileName = newConsole.name.replace(/[^a-zA-Z0-9]+/g, '_') + '.html';
    const filePath = __dirname + '/Consoles/' + fileName;
    fs.writeFileSync(filePath, template);
  } catch (err) {
    console.error('Failed to create console HTML:', err);
  }

  res.status(201).json(newConsole);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
