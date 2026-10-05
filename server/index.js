const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'donnees_budget.json');
const USERS_FILE = path.join(DATA_DIR, 'utilisateurs.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_trail.json');
const AUTH_SECRET = process.env.AUTH_SECRET || 'bbc49_basket_club_secret_key_2026';
const AUDIT_RETENTION_MS = 28 * 24 * 60 * 60 * 1000; // 4 semaines de conservation

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

// =========================================================================
// AUTHENTICATION & USERS MANAGEMENT HELPERS
// =========================================================================

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

function generateToken(userId, role) {
  const timestamp = Date.now();
  const data = `${userId}:${role}:${timestamp}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
  return Buffer.from(`${data}:${sig}`).toString('base64');
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [userId, role, timestampStr, sig] = parts;
    const timestamp = parseInt(timestampStr, 10);
    // Token valid for 30 days
    if (Date.now() - timestamp > 30 * 24 * 3600 * 1000) return null;
    const expectedData = `${userId}:${role}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(expectedData).digest('hex');
    if (sig !== expectedSig) return null;
    return { userId, role };
  } catch (e) {
    return null;
  }
}

function readUsers() {
  ensureDirs();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(data.users) ? data.users : [];
  } catch (e) {
    console.error('[BBC49 Server] Erreur lecture utilisateurs:', e.message);
    return [];
  }
}

function saveUsers(users) {
  ensureDirs();
  atomicWriteFile(USERS_FILE, JSON.stringify({ users, lastUpdated: new Date().toISOString() }, null, 2));
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt
  };
}

// Extraction propre de l'IP cliente (compatible reverse proxy: Nginx, Traefik, Caddy...)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    return first.replace(/^::ffff:/, '');
  }
  const raw = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return raw.replace(/^::ffff:/, '');
}

// Lecture des logs d'audit (historique des 4 dernières semaines / 28 jours)
function readAuditLogs() {
  ensureDirs();
  if (!fs.existsSync(AUDIT_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    const logs = Array.isArray(data.logs) ? data.logs : [];
    const cutoff = Date.now() - AUDIT_RETENTION_MS;
    return logs.filter((l) => new Date(l.timestamp).getTime() >= cutoff);
  } catch (e) {
    console.error('[BBC49 Server] Erreur lecture audit_trail.json:', e.message);
    return [];
  }
}

// Enregistrement d'une action dans le journal d'audit
function appendAuditLog(entry) {
  try {
    ensureDirs();
    const logs = readAuditLogs();
    const newLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.unshift(newLog); // Plus récent en tête
    const cutoff = Date.now() - AUDIT_RETENTION_MS;
    const pruned = logs.filter((l) => new Date(l.timestamp).getTime() >= cutoff);
    atomicWriteFile(
      AUDIT_FILE,
      JSON.stringify({ logs: pruned, lastUpdated: new Date().toISOString() }, null, 2)
    );
    return newLog;
  } catch (e) {
    console.warn('[BBC49 Server] Erreur écriture audit log:', e.message);
    return null;
  }
}

// Middleware: extract optional or required user
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  const users = readUsers();
  return users.find((u) => u.id === payload.userId) || null;
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentification requise' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentification requise' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Droits administrateur requis' });
  }
  req.user = user;
  next();
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initial seed check
seedIfMissing();

// =========================================================================
// API ENDPOINTS
// =========================================================================

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

  const users = readUsers();
  const hasAdmin = users.some((u) => u.role === 'admin');

  res.json({
    status: 'ok',
    mode: 'server',
    application: 'Bouchemaine Basket Club (BBC49) - Suivi Budgétaire',
    version: '2.4.0',
    dataDir: DATA_DIR,
    dbFile: DB_FILE,
    exists,
    stats,
    backupsCount,
    usersCount: users.length,
    authInitialized: hasAdmin,
    serverTime: new Date().toISOString()
  });
});

// 2. Auth: Check Setup Status
app.get('/api/auth/status', (req, res) => {
  const users = readUsers();
  const hasAdmin = users.some((u) => u.role === 'admin');
  res.json({
    initialized: hasAdmin,
    userCount: users.length
  });
});

// 3. Auth: Setup First Admin
app.post('/api/auth/setup-admin', (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis' });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, error: "L'identifiant doit comporter au moins 3 caractères" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit comporter au moins 4 caractères' });
    }

    const users = readUsers();
    const hasAdmin = users.some((u) => u.role === 'admin');
    if (hasAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Un compte administrateur est déjà configuré. Veuillez vous connecter.'
      });
    }

    const adminUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      name: (name || 'Administrateur').trim(),
      role: 'admin',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    saveUsers([adminUser]);
    console.log(`[BBC49 Server] Premier compte administrateur créé: ${adminUser.username}`);

    appendAuditLog({
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
      ip: getClientIp(req),
      action: `Initialisation du compte administrateur: ${adminUser.name} (@${adminUser.username})`,
      actionType: 'user_creation',
    });

    const token = generateToken(adminUser.id, adminUser.role);
    res.json({
      success: true,
      user: sanitizeUser(adminUser),
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Auth: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const users = readUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      appendAuditLog({
        userId: user ? user.id : 'inconnu',
        username: cleanUsername,
        userRole: user ? user.role : 'inconnu',
        ip: getClientIp(req),
        action: `Tentative de connexion échouée pour "${cleanUsername}"`,
        actionType: 'login',
      });
      return res.status(401).json({ success: false, error: 'Identifiant ou mot de passe incorrect' });
    }

    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);

    appendAuditLog({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ip: getClientIp(req),
      action: `Connexion réussie (${user.role === 'admin' ? 'Administrateur' : user.role === 'editor' ? 'Éditeur' : 'Lecture seule'})`,
      actionType: 'login',
    });

    const token = generateToken(user.id, user.role);
    res.json({
      success: true,
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Auth: Get Current User (Me)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// 6. Users Management (Admin Only)
app.get('/api/users', requireAdmin, (req, res) => {
  const users = readUsers().map(sanitizeUser);
  res.json({ success: true, users });
});

app.post('/api/users', requireAdmin, (req, res) => {
  try {
    const { username, name, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis' });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, error: "L'identifiant doit comporter au moins 3 caractères" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit comporter au moins 4 caractères' });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'viewer';

    const users = readUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Cet identifiant est déjà utilisé' });
    }

    const newUser = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      name: (name || cleanUsername).trim(),
      role: assignedRole,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined
    };

    users.push(newUser);
    saveUsers(users);

    appendAuditLog({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      ip: getClientIp(req),
      action: `Création du compte "${newUser.name}" (@${newUser.username}) [Rôle: ${newUser.role}]`,
      actionType: 'user_creation',
    });

    res.json({ success: true, user: sanitizeUser(newUser) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password } = req.body;
    const users = readUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    // Protection: Ne pas retirer les droits admin du dernier admin
    if (role && role !== 'admin' && user.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: "Impossible de retirer les droits du dernier administrateur de l'application"
        });
      }
    }

    if (name) user.name = name.trim();
    if (role && ['admin', 'editor', 'viewer'].includes(role)) user.role = role;
    if (password && password.trim().length >= 4) {
      user.passwordHash = hashPassword(password.trim());
    }

    saveUsers(users);

    appendAuditLog({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      ip: getClientIp(req),
      action: `Modification du compte "${user.username}"${role ? ` (Rôle: ${role})` : ''}${password ? ' [Mot de passe réinitialisé]' : ''}`,
      actionType: 'user_modification',
    });

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    // Protection: Ne pas supprimer son propre compte ni le dernier admin
    if (req.user && req.user.id === id) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    if (user.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: "Impossible de supprimer le dernier administrateur de l'application"
        });
      }
    }

    const filtered = users.filter((u) => u.id !== id);
    saveUsers(filtered);

    appendAuditLog({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      ip: getClientIp(req),
      action: `Suppression du compte "${user.username}"`,
      actionType: 'user_suppression',
    });

    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Load Budget Data
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

// 8. Save Budget Data
app.post('/api/data', (req, res) => {
  try {
    // Si un utilisateur est authentifié en mode lecture seule (viewer), refuser la modification
    const authUser = getAuthUser(req);
    if (authUser && authUser.role === 'viewer') {
      return res.status(403).json({
        success: false,
        error: "Accès refusé : votre compte dispose des droits en lecture seule (viewer)."
      });
    }

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

    appendAuditLog({
      userId: authUser ? authUser.id : 'system',
      username: authUser ? authUser.username : 'Système',
      userRole: authUser ? authUser.role : 'editor',
      ip: getClientIp(req),
      action: 'Sauvegarde de la base de données',
      actionType: 'sauvegarde',
    });

    console.log(`[BBC49 Server] Sauvegarde réussie (${strData.length} octets) à ${timestamp}`);
    return res.json({
      success: true,
      timestamp,
      path: DB_FILE
    });
  } catch (err) {
    console.error('[BBC49 Server] Erreur écriture données:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 9. Audit Trail Endpoints (Admin Only for read, Authenticated for logging)
app.get('/api/audit-logs', requireAdmin, (req, res) => {
  try {
    const logs = readAuditLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audit-logs', requireAuth, (req, res) => {
  try {
    const { action, actionType, details } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Action requise' });
    }
    const log = appendAuditLog({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      ip: getClientIp(req),
      action: String(action),
      actionType: actionType || 'autre',
      details: details ? String(details) : undefined,
    });
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Backups list
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

// 10. Restore Backup (Admin or Editor)
app.post('/api/restore', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (authUser && authUser.role === 'viewer') {
      return res.status(403).json({
        success: false,
        error: "Accès refusé : votre compte dispose des droits en lecture seule (viewer)."
      });
    }

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

// 11. Direct JSON export download
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

// Start Server: listen on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`   BBC49 BUDGET - SERVEUR AUTONOME PRÊT`);
  console.log(`   Accès Web : http://0.0.0.0:${PORT}`);
  console.log(`   Dossier de données : ${DATA_DIR}`);
  console.log(`   Base de données : ${DB_FILE}`);
  console.log(`   Utilisateurs : ${USERS_FILE}`);
  console.log(`=======================================================`);
});
