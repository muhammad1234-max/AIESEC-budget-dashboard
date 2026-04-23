const {
  clampNumber,
  createStorage,
  ensureDefaultAdmin,
  isValidLeafPath,
  json,
  normalizeMonth,
  readJsonBody,
  requireAdmin,
  requireAuth
} = require('../../_lib');

function getIdFromUrl(req) {
  const url = String(req.url || '');
  const match = url.match(/\/api\/financial\/entries\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

module.exports = async (req, res) => {
  const storage = createStorage();
  await ensureDefaultAdmin(storage);

  const user = requireAuth(req, res);
  if (!user) return;
  if (!requireAdmin(user, res)) return;

  const id = String(req.query?.id || '') || getIdFromUrl(req);
  if (!id) return json(res, 400, { error: 'invalid_request' });

  if (req.method === 'DELETE') {
    const entries = await storage.readEntries();
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return json(res, 404, { error: 'not_found' });
    await storage.writeEntries(next);
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'PATCH') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readJsonBody(req).catch(() => null);
  if (!body) return json(res, 400, { error: 'invalid_request' });

  const entries = await storage.readEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return json(res, 404, { error: 'not_found' });

  const current = entries[idx];
  const month = body?.month ? normalizeMonth(String(body.month)) : current.month;
  const type = body?.type ? (body.type === 'revenues' || body.type === 'costs' ? body.type : null) : current.type;
  const pathValue = body?.path ? (Array.isArray(body.path) ? body.path.map((p) => String(p)) : null) : current.path;
  const budgeted = body?.budgeted !== undefined ? clampNumber(body.budgeted) : current.budgeted;
  const actual = body?.actual !== undefined ? clampNumber(body.actual) : current.actual;

  if (!month || month === 'All' || !type || !pathValue || pathValue.length < 2 || budgeted === null || actual === null) {
    return json(res, 400, { error: 'invalid_request' });
  }

  if (!(await isValidLeafPath(type, pathValue))) {
    return json(res, 400, { error: 'invalid_path' });
  }

  entries[idx] = {
    ...current,
    month,
    type,
    path: pathValue,
    budgeted,
    actual,
    updatedAt: new Date().toISOString(),
    updatedBy: user.username
  };
  await storage.writeEntries(entries);
  return json(res, 200, { entry: entries[idx] });
};
