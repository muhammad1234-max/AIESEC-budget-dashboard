const { json, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  const user = requireAuth(req, res);
  if (!user) return;
  return json(res, 200, { user: { id: user.sub, username: user.username, role: user.role } });
};
