import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PieChart, TrendingUp, DollarSign, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Overview" },
    { to: "/budget-actuals", icon: PieChart, label: "Budget vs Actuals" },
    { to: "/exchange-goals", icon: TrendingUp, label: "Exchange Goals" },
    { to: "/financials", icon: DollarSign, label: "Financials" },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className="bg-white border-r border-slate-200 shadow-sm flex flex-col z-10"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {isSidebarOpen ? (
            <span className="text-xl font-bold text-blue-600 truncate">AIESEC Dashboard</span>
          ) : (
            <span className="text-xl font-bold text-blue-600">AD</span>
          )}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-slate-100">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <item.icon size={20} />
              {isSidebarOpen && (
                <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          {isSidebarOpen && <p className="text-xs text-slate-400">© 2026 AIESEC Karachi</p>}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 relative">
        <Outlet />
      </main>
    </div>
  );
}
