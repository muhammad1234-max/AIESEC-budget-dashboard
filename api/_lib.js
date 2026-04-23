const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

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

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw);
}

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

function signJwt(payload, secret, ttlSeconds) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const fullPayload = { ...payload, iat, exp };
  const input =
    base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(fullPayload));
  const sig = crypto.createHmac('sha256', secret).update(input).digest();
  return input + '.' + base64UrlEncode(sig);
}

function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('invalid_token');
  const [h, p, s] = parts;
  const input = h + '.' + p;
  const expected = crypto.createHmac('sha256', secret).update(input).digest();
  const got = base64UrlDecode(s);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) throw new Error('invalid_token');
  const payload = JSON.parse(base64UrlDecode(p).toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload?.exp && now >= payload.exp) throw new Error('expired');
  return payload;
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

function makeId() {
  return crypto.randomUUID();
}

function scryptHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + base64UrlEncode(salt) + '$' + base64UrlEncode(derived);
}

function scryptVerify(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = base64UrlDecode(parts[1]);
  const expected = base64UrlDecode(parts[2]);
  const derived = crypto.scryptSync(String(password), salt, expected.length, { N: 16384, r: 8, p: 1 });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function getJwtSecret() {
  return process.env.JWT_SECRET ? String(process.env.JWT_SECRET) : '';
}

function getTokenTtlSeconds() {
  const v = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 8);
  return Number.isFinite(v) && v > 0 ? v : 60 * 60 * 8;
}

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME ? String(process.env.ADMIN_USERNAME).trim() : '';
  const password = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD) : '';
  return { username, password };
}

async function ensureDefaultAdmin(storage) {
  const { username, password } = getAdminConfig();
  if (!username || !password) return;
  const db = await storage.readUsers();
  const users = Array.isArray(db.users) ? db.users : [];
  const idx = users.findIndex((u) => u?.username === username);
  if (idx === -1) {
    users.push({ id: makeId(), username, passwordHash: scryptHash(password), role: 'admin' });
    await storage.writeUsers({ users });
    return;
  }
  users[idx] = { ...users[idx], username, passwordHash: scryptHash(password), role: users[idx].role || 'admin' };
  await storage.writeUsers({ users });
}

function resolveTmpPath(fileName) {
  const base = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.tmp');
  return path.join(base, fileName);
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function createStorage() {
  const usersPath = resolveTmpPath('users.json');
  const entriesPath = resolveTmpPath('entries.json');
  return {
    readUsers: async () => await readJsonFile(usersPath, { users: [] }),
    writeUsers: async (db) => await writeJsonFile(usersPath, db),
    readEntries: async () => {
      const db = await readJsonFile(entriesPath, { entries: [] });
      return Array.isArray(db.entries) ? db.entries : [];
    },
    writeEntries: async (entries) => await writeJsonFile(entriesPath, { entries })
  };
}

async function readBaseData() {
  const candidates = [
    path.join(process.cwd(), 'dashboard', 'public', 'data.json'),
    path.join(process.cwd(), 'dashboard', 'dist', 'data.json'),
    path.join(process.cwd(), 'data.json')
  ];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch {
    }
  }
  return null;
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

async function buildFinancialsFromEntries(entries, baseFinancials) {
  const baseRevenues = Array.isArray(baseFinancials?.revenues) ? baseFinancials.revenues : null;
  const baseCosts = Array.isArray(baseFinancials?.costs) ? baseFinancials.costs : null;

  const revenues = baseRevenues
    ? structuredClone(baseRevenues)
    : Object.entries(revenueTemplate).map(([name, children]) => buildTreeFromTemplate(name, children));
  const costs = baseCosts
    ? structuredClone(baseCosts)
    : Object.entries(costsTemplate).map(([name, children]) => buildTreeFromTemplate(name, children));

  const revenueLeafMap = buildLeafMapFromRoots(revenues);
  const costLeafMap = buildLeafMapFromRoots(costs);

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

function getAuthUser(req) {
  const header = req.headers?.authorization || '';
  const parts = String(header).split(' ');
  if (parts.length !== 2) return null;
  const token = parts[1];
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    return verifyJwt(token, secret);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    json(res, 401, { error: 'unauthorized' });
    return null;
  }
  return user;
}

function requireAdmin(user, res) {
  if (user?.role !== 'admin') {
    json(res, 403, { error: 'forbidden' });
    return false;
  }
  return true;
}

module.exports = {
  MONTHS,
  buildFinancialsFromEntries,
  clampNumber,
  createStorage,
  ensureDefaultAdmin,
  getAdminConfig,
  getJwtSecret,
  getTokenTtlSeconds,
  isValidLeafPath,
  json,
  makeId,
  normalizeMonth,
  readBaseData,
  readJsonBody,
  requireAdmin,
  requireAuth,
  scryptVerify,
  signJwt
};
