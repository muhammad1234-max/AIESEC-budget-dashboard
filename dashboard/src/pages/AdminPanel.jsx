import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, Pencil, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';

void motion;

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

function buildCategoryIndex(tree) {
  const categories = [];
  const byCategory = new Map();

  const walk = (node, pathParts) => {
    const nextPath = [...pathParts, node.name];
    if (!node.children || node.children.length === 0) {
      const top = nextPath[0];
      if (!byCategory.has(top)) byCategory.set(top, []);
      byCategory.get(top).push(nextPath);
      return;
    }
    node.children.forEach((c) => walk(c, nextPath));
  };

  (tree || []).forEach((root) => {
    categories.push(root.name);
    walk(root, []);
  });

  categories.sort((a, b) => a.localeCompare(b));
  for (const [, v] of byCategory.entries()) {
    v.sort((a, b) => a.join(' / ').localeCompare(b.join(' / ')));
  }

  return { categories, byCategory };
}

export default function AdminPanel() {
  const { token, user } = useAuth();
  const { data, loading: dataLoading } = useData();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState('');

  const [type, setType] = useState('revenues');
  const [month, setMonth] = useState(MONTHS[0]);
  const [category, setCategory] = useState('');
  const [pathValue, setPathValue] = useState(null);
  const [budgeted, setBudgeted] = useState('');
  const [actual, setActual] = useState('');
  const [editingId, setEditingId] = useState('');

  const structure = useMemo(() => {
    const tree = type === 'revenues' ? data?.financials?.revenues : data?.financials?.costs;
    return buildCategoryIndex(tree || []);
  }, [data, type]);

  useEffect(() => {
    const first = structure.categories[0] || '';
    setCategory((prev) => prev || first);
  }, [structure.categories]);

  useEffect(() => {
    const options = structure.byCategory.get(category) || [];
    const first = options[0] || null;
    setPathValue((prev) => prev || first);
  }, [category, structure.byCategory]);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setError('');
    try {
      const res = await fetch('/api/financial/entries', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('failed_to_load');
      const payload = await res.json();
      setEntries(Array.isArray(payload.entries) ? payload.entries : []);
    } catch (err) {
      setError(err?.message || 'failed_to_load');
    } finally {
      setLoadingEntries(false);
    }
  }, [token]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = useCallback(() => {
    setEditingId('');
    setBudgeted('');
    setActual('');
  }, []);

  const submit = useCallback(async () => {
    if (!pathValue || !Array.isArray(pathValue)) return;
    const payload = {
      month,
      type,
      path: pathValue,
      budgeted: Number(budgeted || 0),
      actual: Number(actual || 0)
    };

    const res = await fetch(editingId ? `/api/financial/entries/${editingId}` : '/api/financial/entries', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'save_failed');
    }

    await loadEntries();
    resetForm();
  }, [actual, budgeted, editingId, loadEntries, month, pathValue, resetForm, token, type]);

  const onEdit = useCallback((entry) => {
    setEditingId(entry.id);
    setType(entry.type);
    setMonth(entry.month);
    setCategory(entry.path?.[0] || '');
    setPathValue(entry.path || null);
    setBudgeted(String(entry.budgeted ?? ''));
    setActual(String(entry.actual ?? ''));
  }, []);

  const onDelete = useCallback(async (id) => {
    const res = await fetch(`/api/financial/entries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'delete_failed');
    }
    await loadEntries();
    resetForm();
  }, [loadEntries, resetForm, token]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => e.type === type)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [entries, type]);

  const selectedOptions = useMemo(() => structure.byCategory.get(category) || [], [category, structure.byCategory]);

  if (dataLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading financial structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-start justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">Secure Access</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Add, edit, and delete monthly budgeted and actual entries.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold leading-tight">{user?.username}</div>
            <div className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase leading-tight mt-0.5">{user?.role}</div>
          </div>
          <button onClick={loadEntries} className="btn-primary h-10 px-4">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="xl:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="text-sm font-semibold text-foreground mb-4">Monthly Entry</div>

          <div className="grid grid-cols-1 gap-4">
            <label className="block">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Type</div>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  resetForm();
                }}
                className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
              >
                <option value="revenues">Revenue</option>
                <option value="costs">Costs</option>
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Month</div>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Category</div>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPathValue(null);
                }}
                className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
              >
                {structure.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Subcategory</div>
              <select
                value={pathValue ? pathValue.join(' / ') : ''}
                onChange={(e) => {
                  const target = selectedOptions.find((p) => p.join(' / ') === e.target.value) || null;
                  setPathValue(target);
                }}
                className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
              >
                {selectedOptions.map((p) => (
                  <option key={p.join(' / ')} value={p.join(' / ')}>{p.slice(1).join(' / ')}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Budgeted</div>
                <input
                  inputMode="decimal"
                  value={budgeted}
                  onChange={(e) => setBudgeted(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
                />
              </label>
              <label className="block">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Actual</div>
                <input
                  inputMode="decimal"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 font-medium"
                />
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => submit().catch((err) => setError(err?.message || 'save_failed'))}
                className="btn-primary h-11 px-4 flex-1"
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={resetForm}
                className="h-11 px-4 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="xl:col-span-3 rounded-2xl border border-border bg-card shadow-soft overflow-hidden"
        >
          <div className="border-b border-border bg-surface/30 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Entries</div>
              <div className="text-[11px] text-muted-foreground font-medium">{type === 'revenues' ? 'Revenue' : 'Costs'} entries</div>
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold">
              {loadingEntries ? 'Loading...' : `${filteredEntries.length} items`}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/10">
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Month</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Path</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Budget</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actual</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-muted-foreground font-medium">
                      No entries yet.
                    </td>
                  </tr>
                )}
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-surface/25 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{e.month}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{e.path?.[0]}</div>
                      <div className="text-[11px] text-muted-foreground font-medium">{(e.path || []).slice(1).join(' / ')}</div>
                      <div className="text-[10px] text-muted-foreground/70 font-bold tracking-widest uppercase mt-1">
                        {e.updatedBy || 'system'} · {e.updatedAt ? new Date(e.updatedAt).toLocaleString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-foreground tabular-nums">
                      PKR {Number(e.budgeted || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-foreground tabular-nums">
                      PKR {Number(e.actual || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(e)}
                          className="size-9 rounded-lg bg-surface border border-border hover:bg-surface-elevated transition-colors flex items-center justify-center"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => onDelete(e.id).catch((err) => setError(err?.message || 'delete_failed'))}
                          className="size-9 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors flex items-center justify-center"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4 text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
