// Aster Server - Zero dependencies, pure Node.js
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('[Aster] Starting server...');
console.log('[Aster] Node version:', process.version);
console.log('[Aster] CWD:', process.cwd());
console.log('[Aster] __dirname:', __dirname);

process.on('uncaughtException', (err) => {
  console.error('[Aster] FATAL:', err.message);
  console.error(err.stack);
});

const PORT = process.env.PORT || 3000;
console.log('[Aster] Port:', PORT);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// ===== Database (JSON file) =====
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = { users: [], tokens: [], contacts: [] };
if (fs.existsSync(DB_PATH)) {
  try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (e) { /* reset */ }
}
if (!db.users) db.users = [];
if (!db.tokens) db.tokens = [];
if (!db.contacts) db.contacts = [];

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ===== Crypto helpers =====
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === check;
}

function createToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRY
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + signature;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    const sig = crypto.createHmac('sha256', JWT_SECRET)
      .update(parts[0] + '.' + parts[1]).digest('base64url');
    if (sig !== parts[2]) return null;

    const user = db.users.find(u => u.id === payload.userId);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  } catch (e) { return null; }
}

// ===== Parse body =====
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
    });
  });
}

// ===== MIME types =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;

  // Try both possible roots: same dir (Render) and parent dir (local)
  const roots = [__dirname, path.join(__dirname, '..')];
  let filePath;

  for (const r of roots) {
    const candidate = path.join(r, relativePath);
    if (fs.existsSync(candidate)) { filePath = candidate; break; }
  }
  if (!filePath) filePath = path.join(roots[0], relativePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  // Log for debugging
  console.log('[Static] Request:', req.url, '->', filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('[Static] Not found:', filePath);
      // SPA fallback
      const htmlPath = path.join(roots[0], 'index.html');
      fs.readFile(htmlPath, (err2, html) => {
        if (err2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ===== Auth middleware =====
function authMiddleware(req, res) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
  else {
    const cookie = req.headers.cookie;
    if (cookie) {
      const match = cookie.match(/token=([^;]+)/);
      if (match) token = match[1];
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

function requireAuth(req, res, callback) {
  const user = authMiddleware(req, res);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '请先登录' }));
    return;
  }
  callback(user);
}

function requireAdmin(req, res, callback) {
  requireAuth(req, res, (user) => {
    if (!user.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '没有管理员权限' }));
      return;
    }
    callback(user);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ===== Server =====
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API routes
  if (pathname.startsWith('/api/')) {
    // Health
    if (pathname === '/api/health' && method === 'GET') {
      return json(res, { status: 'ok', time: new Date().toISOString() });
    }

    // Debug filesystem
    if (pathname === '/api/debug' && method === 'GET') {
      const roots = [__dirname, path.join(__dirname, '..')];
      const info = { roots, files: {} };
      roots.forEach(r => {
        try {
          info.files[r] = fs.readdirSync(r);
        } catch(e) {
          info.files[r] = 'ERROR: ' + e.message;
        }
      });
      return json(res, info);
    }

    // Admin health check & fix
    if (pathname === '/api/admin-check' && method === 'GET') {
      const admin = db.users.find(u => u.email === 'undastufff@gmail.com');
      if (!admin) {
        db.users.push({
          id: crypto.randomUUID(),
          email: 'undastufff@gmail.com',
          passwordHash: hashPassword('Aster2025!'),
          name: 'Aster Admin',
          wechat: 'Dyoseff',
          isAdmin: 1,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          loginCount: 0
        });
        saveDb();
        return json(res, { message: 'Admin created', email: 'undastufff@gmail.com', password: 'Aster2025!' });
      }
      if (!admin.isAdmin) {
        admin.isAdmin = 1;
        saveDb();
        return json(res, { message: 'Admin fixed, now isAdmin=1' });
      }
      const { passwordHash, ...safe } = admin;
      return json(res, { message: 'Admin OK', user: safe });
    }

    // === AUTH ===

    // Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password, name, phone, wechat, targetStage, education, notes, source } = body;
      if (!email || !password) return json(res, { error: '邮箱和密码不能为空' }, 400);
      if (password.length < 6) return json(res, { error: '密码至少6位' }, 400);
      if (db.users.find(u => u.email === email.toLowerCase().trim())) {
        return json(res, { error: '该邮箱已注册' }, 409);
      }

      const user = {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        name: name || '',
        phone: phone || '',
        wechat: wechat || '',
        targetStage: targetStage || '',
        education: education || '',
        notes: notes || '',
        source: source || 'web',
        isAdmin: 0,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 1
      };
      db.users.push(user);
      const token = createToken(user.id);
      db.tokens.push({ userId: user.id, token, createdAt: new Date().toISOString() });
      saveDb();

      const { passwordHash, ...safeUser } = user;
      return json(res, { user: safeUser, token }, 201);
    }

    // Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) return json(res, { error: '请输入邮箱和密码' }, 400);

      const user = db.users.find(u => u.email === email.toLowerCase().trim());
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return json(res, { error: '邮箱或密码错误' }, 401);
      }

      user.lastLogin = new Date().toISOString();
      user.loginCount = (user.loginCount || 0) + 1;
      const token = createToken(user.id);
      db.tokens.push({ userId: user.id, token, createdAt: new Date().toISOString() });
      saveDb();

      const { passwordHash, ...safeUser } = user;
      return json(res, { user: safeUser, token });
    }

    // Get me
    if (pathname === '/api/auth/me' && method === 'GET') {
      return requireAuth(req, res, (user) => json(res, { user }));
    }

    // Logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const token = authMiddleware(req, res);
      if (token) {
        db.tokens = db.tokens.filter(t => {
          try {
            const parts = t.token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            return payload.userId !== token.userId;
          } catch (e) { return true; }
        });
        saveDb();
      }
      return json(res, { message: '已退出' });
    }

    // Update profile
    if (pathname === '/api/auth/profile' && method === 'PUT') {
      return requireAuth(req, res, (user) => {
        parseBody(req).then(body => {
          const u = db.users.find(u => u.id === user.id);
          if (!u) return json(res, { error: '用户不存在' }, 404);
          if (body.name !== undefined) u.name = body.name;
          if (body.phone !== undefined) u.phone = body.phone;
          if (body.wechat !== undefined) u.wechat = body.wechat;
          if (body.targetStage !== undefined) u.targetStage = body.targetStage;
          if (body.education !== undefined) u.education = body.education;
          if (body.notes !== undefined) u.notes = body.notes;
          saveDb();
          const { passwordHash, ...safeUser } = u;
          json(res, { user: safeUser });
        });
      });
    }

    // === CONTACT ===

    // Submit contact form
    if (pathname === '/api/contact' && method === 'POST') {
      const body = await parseBody(req);
      const { name, contact, target, message } = body;
      if (!name || !contact || !target) {
        return json(res, { error: '请填写姓名、联系方式和目标阶段' }, 400);
      }
      const entry = {
        id: crypto.randomUUID(),
        name, contact, target, message: message || '',
        createdAt: new Date().toISOString(),
      };
      db.contacts.push(entry);
      saveDb();
      console.log('[Contact] New inquiry from:', name, target);
      return json(res, { message: '收到！我们会在24小时内联系你' }, 201);
    }

    // === ADMIN ===

    // Stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      return requireAdmin(req, res, (user) => {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const weekAgo = new Date(now - 7 * 86400000).toISOString();
        const monthAgo = new Date(now - 30 * 86400000).toISOString();

        const totalUsers = db.users.length;
        const newToday = db.users.filter(u => u.createdAt.slice(0, 10) === today).length;
        const newThisWeek = db.users.filter(u => u.createdAt >= weekAgo).length;
        const newThisMonth = db.users.filter(u => u.createdAt >= monthAgo).length;
        const activeToday = db.users.filter(u => u.lastLogin && u.lastLogin.slice(0, 10) === today).length;

        const byTarget = {};
        db.users.forEach(u => {
          const t = u.targetStage || '未选择';
          byTarget[t] = (byTarget[t] || 0) + 1;
        });
        const byTargetArr = Object.entries(byTarget).map(([k, v]) => ({ target_stage: k, count: v })).sort((a, b) => b.count - a.count);

        const bySource = {};
        db.users.forEach(u => {
          const s = u.source || 'web';
          bySource[s] = (bySource[s] || 0) + 1;
        });
        const bySourceArr = Object.entries(bySource).map(([k, v]) => ({ source: k, count: v }));

        const byDay = {};
        db.users.forEach(u => {
          if (u.createdAt >= monthAgo) {
            const d = u.createdAt.slice(0, 10);
            byDay[d] = (byDay[d] || 0) + 1;
          }
        });
        const byDayArr = Object.entries(byDay).map(([k, v]) => ({ day: k, count: v })).sort((a, b) => a.day.localeCompare(b.day));

        json(res, { totalUsers, newToday, newThisWeek, newThisMonth, activeToday, byTarget: byTargetArr, bySource: bySourceArr, byDay: byDayArr });
      });
    }

    // User list
    if (pathname === '/api/admin/users' && method === 'GET') {
      return requireAdmin(req, res, (user) => {
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 100, 1000);
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        const targetStage = url.searchParams.get('targetStage') || '';
        const search = url.searchParams.get('search') || '';

        let filtered = db.users;
        if (targetStage) {
          filtered = filtered.filter(u => u.targetStage === targetStage);
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(u =>
            (u.name && u.name.toLowerCase().includes(s)) ||
            (u.email && u.email.toLowerCase().includes(s)) ||
            (u.wechat && u.wechat.toLowerCase().includes(s)) ||
            (u.phone && u.phone.includes(s))
          );
        }

        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const paged = filtered.slice(offset, offset + limit).map(u => {
          const { passwordHash, ...safe } = u;
          return safe;
        });

        json(res, { users: paged, limit, offset });
      });
    }

    // CSV Export
    if (pathname === '/api/admin/users/export' && method === 'GET') {
      return requireAdmin(req, res, (user) => {
        const headers = ['ID', '姓名', '邮箱', '手机', '微信', '目标阶段', '学历', '备注', '来源', '注册时间', '最后登录', '登录次数'];
        const rows = db.users.map(u => [
          u.id, u.name || '', u.email || '', u.phone || '', u.wechat || '',
          u.targetStage || '', u.education || '', u.notes || '', u.source || '',
          u.createdAt || '', u.lastLogin || '', u.loginCount || 0
        ]);
        const csv = '﻿' + [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');

        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=aster-users-' + new Date().toISOString().slice(0, 10) + '.csv'
        });
        res.end(csv);
      });
    }

    // Admin: Contact list
    if (pathname === '/api/admin/contacts' && method === 'GET') {
      return requireAdmin(req, res, (user) => {
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 100, 1000);
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        const sorted = [...db.contacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const paged = sorted.slice(offset, offset + limit);
        json(res, { contacts: paged, total: db.contacts.length });
      });
    }

    // Admin: Contact CSV export
    if (pathname === '/api/admin/contacts/export' && method === 'GET') {
      return requireAdmin(req, res, (user) => {
        const headers = ['姓名', '联系方式', '目标阶段', '留言', '提交时间'];
        const rows = db.contacts.map(c => [
          c.name, c.contact, c.target, c.message, c.createdAt
        ]);
        const csv = '﻿' + [headers, ...rows].map(r => r.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=aster-contacts-' + new Date().toISOString().slice(0, 10) + '.csv'
        });
        res.end(csv);
      });
    }

    // API 404
    json(res, { error: 'API Not Found' }, 404);
    return;
  }

  // Static files
  serveStatic(req, res);
});

server.on('error', (err) => {
  console.error('[Aster] Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  ✦ ASTER International Server ✦   ║
║  Running on http://localhost:${PORT}    ║
║  API:  http://localhost:${PORT}/api     ║
║  Zero dependencies — pure Node.js  ║
╚══════════════════════════════════════╝
  `);

  // Create admin user
  const ADMIN_EMAIL = 'undastufff@gmail.com';
  const ADMIN_PASS = 'Aster2025!';
  const ADMIN_WECHAT = 'Dyoseff';

  if (!db.users.find(u => u.email === ADMIN_EMAIL)) {
    db.users.push({
      id: crypto.randomUUID(),
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(ADMIN_PASS),
      name: 'Aster Admin',
      wechat: ADMIN_WECHAT,
      isAdmin: 1,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0
    });
    saveDb();
    console.log('✓ Admin created: ' + ADMIN_EMAIL + ' / ' + ADMIN_PASS);
  } else {
    console.log('✓ Admin exists: ' + ADMIN_EMAIL);
  }

  // Save JWT secret for persistence
  const envPath = path.join(DATA_DIR, '.env');
  fs.writeFileSync(envPath, 'JWT_SECRET=' + JWT_SECRET + '\n');
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
