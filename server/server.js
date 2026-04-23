import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 8);

const ROOT_DIR = path.resolve(process.cwd(), '..');
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const ENTRIES_PATH = path.join(DATA_DIR, 'entries.json');
const BASE_DATA_PATH = path.join(ROOT_DIR, 'dashboard', 'public', 'data.json');

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

const revenueTemplate = {
  'ELD Products': {
    OGTA: {},
    OGTE: {},
    OGV: {},
    IGTA: {},
    EWA: {},
    YSF: {},
    'EWA Initiatives': {},
    'Partner Fees': {},
    'Participant Fees': {},
    Others: {}
  },
  YSF: {
    'YSF Partner Fees': {},
    'YSF Participant Fees': {},
    'YSF Others': {}
  },
  'Other Portfolios and Initiatives': {
    'Participant Fees': {},
    'Partner Fees': {}
  }
};

const costsTemplate = {
  'ELD Products': {
    OGV: {},
    Others: {}
  },
  OPS: {
    OGTA: {},
    Others: {},
    OGTE: {},
    IGTA: {},
    EWA: {}
  }
};

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function makeId() {
  return crypto.randomUUID();
}

function normalizeMonth(m) {
  if (m === 'All') return 'All';
  return MONTHS.includes(m) ? m : null;
}

function clampNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num;
}

async function ensureDefaultAdmin() {
  await ensureDir(DATA_DIR);
  const username = String(process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const providedPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD) : null;

  const existing = await readJson(USERS_PATH, { users: [] });
  const users = Array.isArray(existing.users) ? existing.users : [];
  const idx = users.findIndex((u) => u?.username === username);

  if (idx === -1) {
    const password = providedPassword || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    users.push({ id: makeId(), username, passwordHash, role: 'admin' });
    await writeJson(USERS_PATH, { users });

    if (!providedPassword) {
      console.log('Admin user initialized.');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
    }
    return;
  }

  if (providedPassword) {
    const passwordHash = await bcrypt.hash(providedPassword, 12);
    users[idx] = { ...users[idx], username, passwordHash, role: users[idx].role || 'admin' };
    await writeJson(USERS_PATH, { users });
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  return next();
}

function buildTreeFromTemplate(name, childrenTemplate) {
  const children = Object.entries(childrenTemplate || {}).map(([childName, childChildren]) =>
    buildTreeFromTemplate(childName, childChildren)
  );
  const zero = { values: Object.fromEntries(MONTHS.map((m) => [m, 0])), total: 0 };
  return { name, budget: structuredClone(zero), actual: structuredClone(zero), children };
}

function indexTreeLeaves(node, pathParts, map) {
  const next = [...pathParts, node.name];
  if (!node.children || node.children.length === 0) {
    map.set(next.join(' / '), node);
    return;
  }
  node.children.forEach((c) => indexTreeLeaves(c, next, map));
}

function recalcTotals(node) {
  if (!node.children || node.children.length === 0) {
    node.budget.total = MONTHS.reduce((acc, m) => acc + (node.budget.values[m] || 0), 0);
    node.actual.total = MONTHS.reduce((acc, m) => acc + (node.actual.values[m] || 0), 0);
    return;
  }

  node.children.forEach(recalcTotals);
  for (const m of MONTHS) {
    node.budget.values[m] = node.children.reduce((acc, c) => acc + (c.budget.values[m] || 0), 0);
    node.actual.values[m] = node.children.reduce((acc, c) => acc + (c.actual.values[m] || 0), 0);
  }
  node.budget.total = node.children.reduce((acc, c) => acc + (c.budget.total || 0), 0);
  node.actual.total = node.children.reduce((acc, c) => acc + (c.actual.total || 0), 0);
}

async function readEntries() {
  const data = await readJson(ENTRIES_PATH, { entries: [] });
  if (!Array.isArray(data.entries)) return [];
  return data.entries;
}

async function writeEntries(entries) {
  await writeJson(ENTRIES_PATH, { entries });
}

async function buildFinancialsFromEntries(entries, baseFinancials) {
  const baseRevenues = Array.isArray(baseFinancials?.revenues) ? baseFinancials.revenues : null;
  const baseCosts = Array.isArray(baseFinancials?.costs) ? baseFinancials.costs : null;

  const revenues = baseRevenues
    ? structuredClone(baseRevenues)
    : Object.entries(revenueTemplate).map(([name, children]) => buildTreeFromTemplate(name, children));

  const costs = baseCosts
    ? structuredClone(baseCosts)
    : Object.entries(costsTemplate).map(([name, children]) => buildTreeFromTemplate(name, children));

  const revenueLeafMap = new Map();
  const costLeafMap = new Map();

  revenues.forEach((r) => indexTreeLeaves(r, [], revenueLeafMap));
  costs.forEach((c) => indexTreeLeaves(c, [], costLeafMap));

  for (const entry of entries) {
    if (!entry || !entry.path || !Array.isArray(entry.path) || entry.path.length < 2) continue;
    const month = normalizeMonth(entry.month);
    if (!month || month === 'All') continue;
    const type = entry.type === 'revenues' || entry.type === 'costs' ? entry.type : null;
    if (!type) continue;

    const key = entry.path.join(' / ');
    const target = type === 'revenues' ? revenueLeafMap.get(key) : costLeafMap.get(key);
    if (!target) continue;

    const budgeted = clampNumber(entry.budgeted);
    const actual = clampNumber(entry.actual);
    if (budgeted === null || actual === null) continue;

    target.budget.values[month] = budgeted;
    target.actual.values[month] = actual;
  }

  revenues.forEach(recalcTotals);
  costs.forEach(recalcTotals);

  return { revenues, costs };
}

async function readBaseData() {
  return await readJson(BASE_DATA_PATH, null);
}

function buildLeafMapFromRoots(roots) {
  const leafMap = new Map();
  (roots || []).forEach((r) => indexTreeLeaves(r, [], leafMap));
  return leafMap;
}

async function isValidLeafPath(type, pathValue) {
  if (!Array.isArray(pathValue) || pathValue.length < 2) return false;
  const base = await readBaseData();
  const baseRoots = type === 'revenues' ? base?.financials?.revenues : base?.financials?.costs;
  const roots = Array.isArray(baseRoots)
    ? baseRoots
    : Object.entries(type === 'revenues' ? revenueTemplate : costsTemplate).map(([name, children]) =>
      buildTreeFromTemplate(name, children)
    );
  const leafMap = buildLeafMapFromRoots(roots);
  return leafMap.has(pathValue.join(' / '));
}

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const loginAttempts = new Map();

app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || 'unknown';
  const attempts = loginAttempts.get(ip) || { count: 0, firstAt: Date.now() };
  const now = Date.now();
  if (now - attempts.firstAt > 10 * 60 * 1000) {
    loginAttempts.set(ip, { count: 0, firstAt: now });
  }
  const current = loginAttempts.get(ip) || { count: 0, firstAt: now };
  if (current.count >= 10) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return res.status(400).json({ error: 'invalid_request' });
  }

  const userDb = await readJson(USERS_PATH, { users: [] });
  const user = (userDb.users || []).find((u) => u.username === username);
  if (!user) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  loginAttempts.delete(ip);

  const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS
  });

  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  return res.json({ user: { id: req.user.sub, username: req.user.username, role: req.user.role } });
});

app.get('/api/data', async (req, res) => {
  const base = await readBaseData();
  const entries = await readEntries();

  if (entries.length === 0) {
    if (!base) return res.status(404).json({ error: 'no_data' });
    return res.json(base);
  }

  const financials = await buildFinancialsFromEntries(entries, base?.financials);
  const response = base ? { ...base } : {};
  response.financials = financials;
  if (!('financialRatios' in response)) response.financialRatios = [];
  return res.json(response);
});

app.get('/api/financial/entries', authMiddleware, async (req, res) => {
  const entries = await readEntries();
  return res.json({ entries });
});

app.post('/api/financial/entries', authMiddleware, requireAdmin, async (req, res) => {
  const month = normalizeMonth(String(req.body?.month || ''));
  const type = req.body?.type === 'revenues' || req.body?.type === 'costs' ? req.body.type : null;
  const pathValue = Array.isArray(req.body?.path) ? req.body.path.map((p) => String(p)) : null;
  const budgeted = clampNumber(req.body?.budgeted);
  const actual = clampNumber(req.body?.actual);

  if (!month || month === 'All' || !type || !pathValue || pathValue.length < 2 || budgeted === null || actual === null) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  if (!(await isValidLeafPath(type, pathValue))) {
    return res.status(400).json({ error: 'invalid_path' });
  }

  const entries = await readEntries();
  const entry = {
    id: makeId(),
    month,
    type,
    path: pathValue,
    budgeted,
    actual,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };
  entries.push(entry);
  await writeEntries(entries);
  return res.status(201).json({ entry });
});

app.patch('/api/financial/entries/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const entries = await readEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });

  const current = entries[idx];
  const month = req.body?.month ? normalizeMonth(String(req.body.month)) : current.month;
  const type = req.body?.type ? (req.body.type === 'revenues' || req.body.type === 'costs' ? req.body.type : null) : current.type;
  const pathValue = req.body?.path ? (Array.isArray(req.body.path) ? req.body.path.map((p) => String(p)) : null) : current.path;
  const budgeted = req.body?.budgeted !== undefined ? clampNumber(req.body.budgeted) : current.budgeted;
  const actual = req.body?.actual !== undefined ? clampNumber(req.body.actual) : current.actual;

  if (!month || month === 'All' || !type || !pathValue || pathValue.length < 2 || budgeted === null || actual === null) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  if (!(await isValidLeafPath(type, pathValue))) {
    return res.status(400).json({ error: 'invalid_path' });
  }

  entries[idx] = {
    ...current,
    month,
    type,
    path: pathValue,
    budgeted,
    actual,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };
  await writeEntries(entries);
  return res.json({ entry: entries[idx] });
});

app.delete('/api/financial/entries/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const entries = await readEntries();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return res.status(404).json({ error: 'not_found' });
  await writeEntries(next);
  return res.status(204).send();
});

await ensureDefaultAdmin();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
