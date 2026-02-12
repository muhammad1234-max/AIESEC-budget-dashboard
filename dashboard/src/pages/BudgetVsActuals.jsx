import React from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

export default function BudgetVsActuals() {
  const { data, loading } = useData();

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Error loading data.</div>;

  // Process data for comparison
  const getComparisons = (actuals, budgets) => {
    return actuals.map(act => {
      const budget = budgets.find(b => b.description === act.description);
      const budgetVal = budget ? budget.total : 0;
      return {
        name: act.description.split(':')[0], // Shorten name
        fullName: act.description,
        Actual: act.total,
        Budget: budgetVal,
        Variance: act.total - budgetVal,
        Percentage: budgetVal > 0 ? ((act.total - budgetVal) / budgetVal) * 100 : 0
      };
    }).sort((a, b) => b.Actual - a.Actual).slice(0, 10); // Top 10
  };

  const costComparison = getComparisons(data.actuals.costs, data.budget.costs);
  const revComparison = getComparisons(data.actuals.revenues, data.budget.revenues);

  const formatCurrency = (val) => {
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
          <p className="font-bold text-slate-900 mb-2">{payload[0].payload.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-slate-500">Budget: <span className="font-medium text-slate-700">PKR {payload[0].payload.Budget.toLocaleString()}</span></p>
            <p className="text-sm text-slate-500">Actual: <span className="font-medium text-slate-700">PKR {payload[0].payload.Actual.toLocaleString()}</span></p>
            <p className={`text-sm font-bold ${payload[0].payload.Variance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              Variance: {payload[0].payload.Variance > 0 ? '+' : ''}{payload[0].payload.Variance.toLocaleString()}
              ({payload[0].payload.Percentage.toFixed(1)}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Budget vs Actuals</h1>
        <p className="text-slate-500 mt-1">Detailed variance analysis for top items</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <div className="w-2 h-6 bg-rose-500 rounded mr-3"></div>
            Top 10 Costs Analysis
          </h3>
        </div>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costComparison} layout="vertical" margin={{ left: 10, right: 30 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <defs>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="colorActualCost" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <Bar dataKey="Budget" fill="url(#colorBudget)" barSize={12} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Actual" fill="url(#colorActualCost)" barSize={12} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <div className="w-2 h-6 bg-emerald-500 rounded mr-3"></div>
            Top 10 Revenues Analysis
          </h3>
        </div>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revComparison} layout="vertical" margin={{ left: 10, right: 30 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <defs>
                <linearGradient id="colorActualRev" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <Bar dataKey="Budget" fill="url(#colorBudget)" barSize={12} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Actual" fill="url(#colorActualRev)" barSize={12} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
