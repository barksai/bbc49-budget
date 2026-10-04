const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'donnees_budget.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// Seed initial data if DB file does not exist (useful for clean Docker volume mounts)
function seedIfMissing() {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    console.log(`[BBC49 Server] Aucun fichier ${DB_FILE} détecté. Recherche d'une source initiale...`);
    const possibleSeeds = [
      path.join(__dirname, '../data_seed/donnees_budget.json'),
      path.join(__dirname, '../data/donnees_budget.json'),
      path.join(__dirname, 'donnees_budget_seed.json')
    ];
    let seeded = false;
    for (const seedPath of possibleSeeds) {
      if (fs.existsSync(seedPath) && seedPath !== DB_FILE) {
        try {
          fs.copyFileSync(seedPath, DB_FILE);
          console.log(`[BBC49 Server] Base initialisée avec succès depuis: ${seedPath}`);
          seeded = true;
          break;
        } catch (e) {
          console.warn(`[BBC49 Server] Échec de copie depuis ${seedPath}:`, e.message);
        }
      }
    }
    if (!seeded) {
      console.warn('[BBC49 Server] Aucune graine trouvée. Une base vierge sera créée lors du premier enregistrement.');
    }
  }
}

// Helper: atomic write
function atomicWriteFile(filePath, dataString) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, dataString, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

// Helper: create dated backup
function createBackup(dataString) {
  try {
    ensureDirs();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupPath = path.join(BACKUPS_DIR, `donnees_budget_${timestamp}.json`);
    fs.writeFileSync(backupPath, dataString, 'utf8');

    // Keep up to 50 backups
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('donnees_budget_') && f.endsWith('.json'))
      .sort();
    if (files.length > 50) {
      const toDelete = files.slice(0, files.length - 50);
      toDelete.forEach((f) => {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, f));
        } catch (_) {}
      });
    }
  } catch (err) {
    console.warn('[BBC49 Server] Erreur création backup:', err.message);
  }
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initial seed check
seedIfMissing();

// API Endpoints
// 1. Status & Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  const exists = fs.existsSync(DB_FILE);
  let stats = null;
  if (exists) {
    try {
      const s = fs.statSync(DB_FILE);
      stats = { size: s.size, modified: s.mtime.toISOString() };
    } catch (_) {}
  }

  let backupsCount = 0;
  if (fs.existsSync(BACKUPS_DIR)) {
    try {
      backupsCount = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).length;
    } catch (_) {}
  }

  res.json({
    status: 'ok',
    mode: 'server',
    application: 'Bouchemaine Basket Club (BBC49) - Suivi Budgétaire',
    version: '1.0.0',
    dataDir: DATA_DIR,
    dbFile: DB_FILE,
    exists,
    stats,
    backupsCount,
    serverTime: new Date().toISOString()
  });
});

// 2. Load Budget Data
app.get('/api/data', (req, res) => {
  try {
    ensureDirs();
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      return res.json({
        success: true,
        data: parsed,
        path: DB_FILE,
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      });
    }
    return res.status(404).json({
      success: false,
      notFound: true,
      path: DB_FILE,
      message: 'Fichier donnees_budget.json non trouvé'
    });
  } catch (err) {
    console.error('[BBC49 Server] Erreur lecture données:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 3. Save Budget Data
app.post('/api/data', (req, res) => {
  try {
    ensureDirs();
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Corps de requête invalide' });
    }

    const timestamp = new Date().toISOString();
    const payload = {
      ...data,
      lastUpdated: timestamp
    };

    const strData = JSON.stringify(payload, null, 2);

    // Create backup first
    createBackup(strData);

    // Save atomically
    atomicWriteFile(DB_FILE, strData);

    console.log(`[BBC49 Server] Sauvegarde réussie (${strData.length} octets) à ${timestamp}`);
    return res.json({
      success: true,
      timestamp,
      path: DB_FILE
    });
  } catch (err) {
    console.error('[BBC49 Server] Erreur sauvegarde données:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 4. Backups list
app.get('/api/backups', (req, res) => {
  try {
    ensureDirs();
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('donnees_budget_') && f.endsWith('.json'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.birthtime || stat.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, backups: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Restore Backup
app.post('/api/restore', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Nom de fichier requis' });
    }
    const safeFilename = path.basename(filename);
    const backupPath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: 'Sauvegarde introuvable' });
    }

    const content = fs.readFileSync(backupPath, 'utf8');
    // Pre-backup current before restoring
    if (fs.existsSync(DB_FILE)) {
      createBackup(fs.readFileSync(DB_FILE, 'utf8'));
    }
    atomicWriteFile(DB_FILE, content);

    console.log(`[BBC49 Server] Restauration effectuée depuis ${safeFilename}`);
    res.json({ success: true, message: `Restauration réussie depuis ${safeFilename}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Direct JSON export download
app.get('/api/export', (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    res.setHeader('Content-Disposition', 'attachment; filename="donnees_budget_bbc49.json"');
    res.setHeader('Content-Type', 'application/json');
    return fs.createReadStream(DB_FILE).pipe(res);
  }
  return res.status(404).send('Fichier de données introuvable');
});

// Serve frontend static build
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>BBC49 Budget - Serveur Actif</title></head>
        <body style="font-family: sans-serif; background: #0f1115; color: #fff; text-align: center; padding: 40px;">
          <h1 style="color: #c8102e;">Bouchemaine Basket Club (BBC49)</h1>
          <p>Le serveur de données est opérationnel.</p>
          <p>Le dossier frontend <code>dist/</code> n'a pas encore été compilé. Exécutez <code>npm run build</code>.</p>
          <p><a href="/api/status" style="color: #10b981;">Vérifier le statut de l'API</a></p>
        </body>
      </html>
    `);
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`   BBC49 BUDGET - SERVEUR AUTONOME PRÊT`);
  console.log(`   Accès Web : http://0.0.0.0:${PORT}`);
  console.log(`   Dossier de données : ${DATA_DIR}`);
  console.log(`   Base de données : ${DB_FILE}`);
  console.log(`=======================================================`);
});
