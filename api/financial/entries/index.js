const {
  clampNumber,
  createStorage,
  ensureDefaultAdmin,
  isValidLeafPath,
  json,
  makeId,
  normalizeMonth,
  readJsonBody,
  requireAdmin,
  requireAuth
} = require('../../_lib');

module.exports = async (req, res) => {
  const storage = createStorage();
  await ensureDefaultAdmin(storage);

  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const entries = await storage.readEntries();
    return json(res, 200, { entries });
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!requireAdmin(user, res)) return;

  const body = await readJsonBody(req).catch(() => null);
  if (!body) return json(res, 400, { error: 'invalid_request' });

  const month = normalizeMonth(String(body?.month || ''));
  const type = body?.type === 'revenues' || body?.type === 'costs' ? body.type : null;
  const pathValue = Array.isArray(body?.path) ? body.path.map((p) => String(p)) : null;
  const budgeted = clampNumber(body?.budgeted);
  const actual = clampNumber(body?.actual);

  if (!month || month === 'All' || !type || !pathValue || pathValue.length < 2 || budgeted === null || actual === null) {
    return json(res, 400, { error: 'invalid_request' });
  }

  if (!(await isValidLeafPath(type, pathValue))) {
    return json(res, 400, { error: 'invalid_path' });
  }

  const entries = await storage.readEntries();
  const entry = {
    id: makeId(),
    month,
    type,
    path: pathValue,
    budgeted,
    actual,
    updatedAt: new Date().toISOString(),
    updatedBy: user.username
  };
  entries.push(entry);
  await storage.writeEntries(entries);
  return json(res, 201, { entry });
};
