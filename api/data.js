const { buildFinancialsFromEntries, createStorage, json, readBaseData } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  const base = await readBaseData();
  const storage = createStorage();
  const entries = await storage.readEntries();

  if (entries.length === 0) {
    if (!base) return json(res, 404, { error: 'no_data' });
    return json(res, 200, base);
  }

  const financials = await buildFinancialsFromEntries(entries, base?.financials);
  const response = base ? { ...base } : {};
  response.financials = financials;
  if (!('financialRatios' in response)) response.financialRatios = [];
  return json(res, 200, response);
};
