import React from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

export default function ExchangeGoals() {
  const { data, loading } = useData();

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Error loading data.</div>;

  const { opens, approvals, realizations } = data.goals;
  const programs = ['oGV', 'oGTa', 'oGTe', 'iGV', 'iGTa', 'iGTe'];

  const chartData = programs.map(prog => ({
    name: prog,
    Opens: opens[prog],
    Approvals: approvals[prog],
    Realizations: realizations[prog]
  }));

  const colors = {
    Opens: '#3b82f6',
    Approvals: '#8b5cf6',
    Realizations: '#10b981'
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Exchange Goals</h1>
        <p className="text-slate-500 mt-1">Performance tracking across all programs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['Opens', 'Approvals', 'Realizations'].map((metric, idx) => (
          <motion.div
            key={metric}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-700">{metric}</h3>
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: colors[metric] }}></div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[metric]} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={colors[metric]} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey={metric} fill={`url(#gradient-${metric})`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-6">Comprehensive Overview</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <defs>
                <linearGradient id="gradOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradApprovals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="gradRealizations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Opens" fill="url(#gradOpens)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Approvals" fill="url(#gradApprovals)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizations" fill="url(#gradRealizations)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
