import React from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';

const Card = ({ title, value, subtext, icon: Icon, bgClass, iconClass, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon size={22} className={iconClass} />
      </div>
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
  </motion.div>
);

export default function Dashboard() {
  const { data, loading } = useData();

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading dashboard data...</div>;
  if (!data) return <div className="p-8 text-red-500">Error loading data.</div>;

  // Calculate totals
  const totalBudgetCost = data.budget.costs.reduce((acc, item) => acc + item.total, 0);
  const totalActualCost = data.actuals.costs.reduce((acc, item) => acc + item.total, 0);
  const totalBudgetRev = data.budget.revenues.reduce((acc, item) => acc + item.total, 0);
  const totalActualRev = data.actuals.revenues.reduce((acc, item) => acc + item.total, 0);

  const totalExchangeRealizations = Object.values(data.goals.realizations).reduce((a, b) => a + b, 0);

  // Prepare chart data (Monthly aggregate)
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const chartData = months.map(month => {
    const budgetCost = data.budget.costs.reduce((acc, item) => acc + (item.values[month] || 0), 0);
    const actualCost = data.actuals.costs.reduce((acc, item) => acc + (item.values[month] || 0), 0);
    const budgetRev = data.budget.revenues.reduce((acc, item) => acc + (item.values[month] || 0), 0);
    const actualRev = data.actuals.revenues.reduce((acc, item) => acc + (item.values[month] || 0), 0);

    return {
      name: month,
      BudgetCost: budgetCost,
      ActualCost: actualCost,
      BudgetRev: budgetRev,
      ActualRev: actualRev
    };
  });

  const formatCurrency = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Real-time financial and operational insights</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-pulse">
          Live Updates Active
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Actual Revenue"
          value={`PKR ${totalActualRev.toLocaleString()}`}
          subtext={`Budgeted: PKR ${totalBudgetRev.toLocaleString()}`}
          icon={DollarSign}
          bgClass="bg-emerald-500/10"
          iconClass="text-emerald-500"
          delay={0}
        />
        <Card
          title="Total Actual Costs"
          value={`PKR ${totalActualCost.toLocaleString()}`}
          subtext={`Budgeted: PKR ${totalBudgetCost.toLocaleString()}`}
          icon={TrendingUp}
          bgClass="bg-rose-500/10"
          iconClass="text-rose-500"
          delay={0.1}
        />
        <Card
          title="Net Profit (Actual)"
          value={`PKR ${(totalActualRev - totalActualCost).toLocaleString()}`}
          subtext={totalActualRev - totalActualCost >= 0 ? "Profitable Status" : "Deficit Warning"}
          icon={Activity}
          bgClass="bg-blue-500/10"
          iconClass="text-blue-500"
          delay={0.2}
        />
        <Card
          title="Total Realizations"
          value={totalExchangeRealizations}
          subtext="Exchange Goals Achieved"
          icon={Users}
          bgClass="bg-indigo-500/10"
          iconClass="text-indigo-500"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg mr-3">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            Revenue Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <defs>
                  <linearGradient id="colorRevBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorRevActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="BudgetRev" name="Budget" fill="url(#colorRevBudget)" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="ActualRev" name="Actual" fill="url(#colorRevActual)" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <div className="p-2 bg-rose-100 rounded-lg mr-3">
              <TrendingUp size={20} className="text-rose-600" />
            </div>
            Cost Analysis
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <defs>
                  <linearGradient id="colorCostBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorCostActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="BudgetCost" name="Budget" fill="url(#colorCostBudget)" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="ActualCost" name="Actual" fill="url(#colorCostActual)" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
