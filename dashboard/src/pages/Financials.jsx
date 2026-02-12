import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { motion } from 'framer-motion';

export default function Financials() {
  const { data, loading } = useData();
  const [activeTab, setActiveTab] = useState('revenues'); // 'revenues' or 'costs'

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Error loading data.</div>;

  const items = activeTab === 'revenues' ? data.actuals.revenues : data.actuals.costs;
  const budgetItems = activeTab === 'revenues' ? data.budget.revenues : data.budget.costs;

  // Helper to find budget for a specific item description (simple matching)
  const getBudget = (desc) => {
    const found = budgetItems.find(i => i.description === desc);
    return found ? found.total : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Financial Details</h1>
        <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('revenues')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'revenues' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
                Revenues
            </button>
            <button 
                onClick={() => setActiveTab('costs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'costs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
                Costs
            </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={activeTab}
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 font-medium">Description</th>
                        <th className="px-6 py-4 font-medium text-right">Budget (Total)</th>
                        <th className="px-6 py-4 font-medium text-right">Actual (Total)</th>
                        <th className="px-6 py-4 font-medium text-right">Variance</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => {
                        const budget = getBudget(item.description);
                        const variance = item.total - budget;
                        return (
                            <tr key={idx} className="bg-white border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.description}</td>
                                <td className="px-6 py-4 text-right">PKR {budget.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">PKR {item.total.toLocaleString()}</td>
                                <td className={`px-6 py-4 text-right font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                                </td>
                            </tr>
                        );
                    })}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No data available</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </motion.div>
    </div>
  );
}
