import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';

void motion;

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border p-4 rounded-xl shadow-elegant min-w-[240px]">
        <p className="font-bold text-foreground mb-3 text-sm tracking-tight">{data.fullName}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-8 text-[11px]">
            <span className="text-muted-foreground font-bold uppercase tracking-wider">Budgeted</span>
            <span className="font-semibold text-foreground tabular-nums">PKR {data.Budget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center gap-8 text-[11px]">
            <span className="text-muted-foreground font-bold uppercase tracking-wider">Realized</span>
            <span className="font-semibold text-foreground tabular-nums">PKR {data.Actual.toLocaleString()}</span>
          </div>
          <div className="pt-2 border-t border-border/50 flex justify-between items-center gap-8">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Variance</span>
            <span className={`font-bold text-sm tabular-nums ${data.Variance >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {data.Variance > 0 ? '+' : ''}{data.Variance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function BudgetVsActuals() {
  const { data, loading } = useData();
  const [selectedMonth, setSelectedMonth] = useState('All');

  const months = ['All', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Calculating variances...</p>
    </div>
  );

  if (!data) return null;

  const flattenLeaves = (nodes, pathParts = []) => {
    const rows = [];
    for (const node of nodes || []) {
      const nextPath = [...pathParts, node.name];
      if (!node.children || node.children.length === 0) {
        const budget = selectedMonth === 'All' ? (node.budget?.total || 0) : (node.budget?.values?.[selectedMonth] || 0);
        const actual = selectedMonth === 'All' ? (node.actual?.total || 0) : (node.actual?.values?.[selectedMonth] || 0);
        rows.push({
          name: node.name,
          fullName: nextPath.join(' / '),
          Actual: actual,
          Budget: budget,
          Variance: actual - budget,
          Percentage: budget > 0 ? ((actual - budget) / budget) * 100 : 0
        });
        continue;
      }
      rows.push(...flattenLeaves(node.children, nextPath));
    }
    return rows;
  };

  const costsLeaves = flattenLeaves(data.financials?.costs || []);
  const revenuesLeaves = flattenLeaves(data.financials?.revenues || []);

  const costComparison = costsLeaves
    .sort((a, b) => Math.abs(b.Variance) - Math.abs(a.Variance))
    .slice(0, 10);

  const revComparison = revenuesLeaves
    .sort((a, b) => Math.abs(b.Variance) - Math.abs(a.Variance))
    .slice(0, 10);

  const formatCurrency = (val) => {
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">Variance Analysis</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Budget <span className="gradient-text">Performance</span></h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Detailed comparison between operational targets and actual realization across entity streams.
          </p>
        </div>

        <div className="relative mt-4 md:mt-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 pl-4 pr-8 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 appearance-none font-medium cursor-pointer"
          >
            {months.map(m => (
              <option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <ArrowDownRight size={14} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-8 shadow-soft"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-rose-500 rounded-full shadow-glow" />
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Operational Costs</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Top 10 High-Impact Items</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-2 rounded-lg bg-surface border border-border">
              <div className="flex items-center gap-2 px-2">
                <div className="size-2 rounded-full bg-surface-elevated border border-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="size-2 rounded-full bg-rose-500 shadow-glow" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actual</span>
              </div>
            </div>
          </div>

          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costComparison} layout="vertical" margin={{ left: 0, right: 40 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="oklch(1 0 0 / 0.05)" />
                <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(1 0 0 / 0.05)' }} />
                <Bar dataKey="Budget" fill="var(--surface-elevated)" barSize={12} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Actual" fill="var(--rose-500)" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-8 shadow-soft"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-primary rounded-full shadow-glow" />
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Revenue Streams</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Key Growth Drivers</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-2 rounded-lg bg-surface border border-border">
              <div className="flex items-center gap-2 px-2">
                <div className="size-2 rounded-full bg-surface-elevated border border-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="size-2 rounded-full bg-primary shadow-glow" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actual</span>
              </div>
            </div>
          </div>

          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revComparison} layout="vertical" margin={{ left: 0, right: 40 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="oklch(1 0 0 / 0.05)" />
                <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 600 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(1 0 0 / 0.05)' }} />
                <Bar dataKey="Budget" fill="var(--surface-elevated)" barSize={12} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Actual" fill="var(--primary)" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
