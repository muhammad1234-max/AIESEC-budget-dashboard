const {
  createStorage,
  ensureDefaultAdmin,
  getAdminConfig,
  getJwtSecret,
  getTokenTtlSeconds,
  json,
  readJsonBody,
  scryptVerify,
  signJwt
} = require('../_lib');

const loginAttempts = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const secret = getJwtSecret();
  const { username: adminUsername, password: adminPassword } = getAdminConfig();
  if (!secret || !adminUsername || !adminPassword) {
    const missing = [];
    if (!secret) missing.push('JWT_SECRET');
    if (!adminUsername) missing.push('ADMIN_USERNAME');
    if (!adminPassword) missing.push('ADMIN_PASSWORD');
    return json(res, 500, { error: 'server_not_configured', missing });
  }

  const ip =
    (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
    req.socket?.remoteAddress ||
    'unknown';

  const attempts = loginAttempts.get(ip) || { count: 0, firstAt: Date.now() };
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  if (now - attempts.firstAt > windowMs) loginAttempts.set(ip, { count: 0, firstAt: now });
  const current = loginAttempts.get(ip) || { count: 0, firstAt: now };
  if (current.count >= 10) return json(res, 429, { error: 'too_many_attempts' });

  const body = await readJsonBody(req).catch(() => null);
  if (!body) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return json(res, 400, { error: 'invalid_request' });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return json(res, 400, { error: 'invalid_request' });
  }

  const storage = createStorage();
  await ensureDefaultAdmin(storage);
  const userDb = await storage.readUsers();
  const user = (userDb.users || []).find((u) => u?.username === username);

  if (!user || !scryptVerify(password, user.passwordHash)) {
    loginAttempts.set(ip, { count: current.count + 1, firstAt: current.firstAt });
    return json(res, 401, { error: 'invalid_credentials' });
  }

  loginAttempts.delete(ip);

  const token = signJwt({ sub: user.id, username: user.username, role: user.role }, secret, getTokenTtlSeconds());
  return json(res, 200, { token, user: { id: user.id, username: user.username, role: user.role } });
};
