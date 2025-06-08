// backend/server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Setup image storage directory
const uploadDir = path.join(__dirname, 'covers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Setup multer for image handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/covers', express.static(uploadDir));

// Initialize SQLite database
const db = new sqlite3.Database('./games.db', err => {
  if (err) console.error('SQLite connection error:', err.message);
  else console.log(' Connected to SQLite database.');
});

// Create table if not exists (with new columns: platform, romPath, emuPath)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT '3DS',
      romPath TEXT,
      emuPath TEXT,
      region TEXT,
      fileName TEXT,
      fileSizeMB INTEGER,
      isPatched INTEGER DEFAULT 0,
      imageUrl TEXT
      hoursPlayed INTEGER DEFAULT 0
    )
  `);
    // Migrate existing DBs lacking the hoursPlayed column
  db.all(`PRAGMA table_info(games);`, (err, rows) => {
    if (err) {
      console.error('Failed to read table info:', err.message);
      return;
    }
    const hasColumn = rows.some(r => r.name === 'hoursPlayed');
    if (!hasColumn) {
      db.run(`ALTER TABLE games ADD COLUMN hoursPlayed INTEGER DEFAULT 0`, err2 => {
        if (err2) console.error('Failed to add hoursPlayed column:', err2.message);
        else console.log('Migrated: added hoursPlayed column to games table.');
      });
    }
  });
});

// Helpers
const runDbQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const queryDb = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

// Routes

app.get('/api', async (req, res) => {
  try {
    const rows = await queryDb('SELECT * FROM games');
    console.log(`[GET] /api — ${rows.length} games`);
    res.json(rows);
  } catch (err) {
    console.error(`[GET] /api — Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api', upload.single('cover'), async (req, res) => {
  const { title, platform, romPath, emuPath, region, fileName, fileSizeMB, isPatched, hoursPlayed } = req.body;
  const imageUrl = req.file ? `/covers/${req.file.filename}` : null;

  try {
    const result = await runDbQuery(
      `
      INSERT INTO games
        (title, platform, romPath, emuPath, region, fileName, fileSizeMB, isPatched, imageUrl, hoursPlayed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        title,
        platform,
        romPath,
        emuPath,
        region || '',
        fileName || '',
        fileSizeMB || 0,
        isPatched ? 1 : 0,
        imageUrl,
        hoursPlayed || 0
      ]
    );
    console.log(`[POST] /api — Added game "${title}" (ID: ${result.lastID})`);
    res.json({ status: 'CREATE ENTRY SUCCESSFUL', id: result.lastID });
  } catch (err) {
    console.error(`[POST] /api — Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/:id', upload.single('cover'), async (req, res) => {
  // Allow updating any of these fields:
  const allowedFields = [
    'title',
    'platform',
    'romPath',
    'emuPath',
    'region',
    'fileName',
    'fileSizeMB',
    'isPatched',
    'imageUrl',
    'hoursPlayed',
  ];

  // If a new cover image was uploaded, delete the previous file
  if (req.file) {
    const newImageUrl = `/covers/${req.file.filename}`;
    try {
      const [game] = await queryDb('SELECT imageUrl FROM games WHERE id = ?', [
        req.params.id,
      ]);
      if (game && game.imageUrl) {
        const oldPath = path.join(__dirname, game.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } catch (err) {
      console.error(
        `[PUT] /api/${req.params.id} — Error reading old cover:`,
        err.message
      );
    }
    req.body.imageUrl = newImageUrl;
  }

  const fieldsToUpdate = allowedFields.filter((key) => key in req.body);
  if (!fieldsToUpdate.length)
    return res.status(400).json({ error: 'No valid fields provided.' });

  const sql = `UPDATE games SET ${fieldsToUpdate
    .map((f) => `${f} = ?`)
    .join(', ')} WHERE id = ?`;
  const params = [...fieldsToUpdate.map((f) => req.body[f]), req.params.id];

  try {
    await runDbQuery(sql, params);
    console.log(
      `[PUT] /api/${req.params.id} — Updated fields: ${fieldsToUpdate.join(', ')}`,
    );
    res.json({ status: 'UPDATE ITEM SUCCESSFUL' });
  } catch (err) {
    console.error(`[PUT] /api/${req.params.id} — Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/:id', async (req, res) => {
  try {
    const [game] = await queryDb('SELECT imageUrl FROM games WHERE id = ?', [req.params.id]);
    if (game && game.imageUrl) {
      const filePath = path.join(__dirname, game.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await runDbQuery('DELETE FROM games WHERE id = ?', [req.params.id]);
    console.log(`[DELETE] /api/${req.params.id} — Deleted game`);
    res.json({ status: 'DELETE ITEM SUCCESSFUL' });
  } catch (err) {
    console.error(`[DELETE] /api/${req.params.id} — Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api', async (req, res) => {
  const newGames = req.body;
  if (!Array.isArray(newGames)) {
    return res.status(400).json({ error: 'Invalid collection format' });
  }

  try {
    // Delete all existing records (and their cover files)
    const rows = await queryDb('SELECT imageUrl FROM games');
    rows.forEach(row => {
      if (row.imageUrl) {
        const filePath = path.join(__dirname, row.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });
    await runDbQuery('DELETE FROM games');

    // Insert each game from newGames array
    for (const g of newGames) {
      await runDbQuery(
        `
        INSERT INTO games
          (title, platform, romPath, emuPath, region, fileName, fileSizeMB, isPatched, imageUrl, hoursPlayed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          g.title,
          g.platform || '3DS',
          g.romPath || '',
          g.emuPath || '',
          g.region || '',
          g.fileName || '',
          g.fileSizeMB || 0,
          g.isPatched || 0,
          g.imageUrl || null,
          g.hoursPlayed || 0, 
        ]
      );
    }

    console.log(`[PUT] /api — Replaced collection with ${newGames.length} games`);
    res.json({ status: 'REPLACED COLLECTION' });
  } catch (err) {
    console.error(`[PUT] /api — Error replacing collection:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api', async (req, res) => {
  try {
    const rows = await queryDb('SELECT imageUrl FROM games');
    rows.forEach(row => {
      if (row.imageUrl) {
        const filePath = path.join(__dirname, row.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });
    await runDbQuery('DELETE FROM games');
    console.log(`[DELETE] /api — Deleted all games and cover images`);
    res.json({ status: 'DELETE ALL SUCCESSFUL' });
  } catch (err) {
    console.error(`[DELETE] /api — Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
