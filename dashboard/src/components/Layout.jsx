import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
  Percent,
  DollarSign,
  Menu,
  Shield,
  Sun,
  Moon,
  Search,
  Bell,
  Command,
  LifeBuoy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import aiesecLogo from "../assets/Aiesec_logo.png";
import { useAuth } from "../hooks/useAuth";

void motion;

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onMouseDown = (e) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(e.target)) setIsProfileMenuOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isProfileMenuOpen]);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Overview" },
    { to: "/budget-actuals", icon: PieChart, label: "Analytics" },
    { to: "/financial-ratios", icon: Percent, label: "Financial Ratios" },
    { to: "/financials", icon: DollarSign, label: "Financials" },
    ...(user ? [{ to: "/admin", icon: Shield, label: "Admin Panel" }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 88 }}
        className="hidden lg:flex flex-col shrink-0 border-r border-border bg-surface/40 backdrop-blur-xl z-30 relative transition-all duration-300"
      >
        <div className={`h-20 flex items-center ${isSidebarOpen ? 'px-6' : 'px-3 justify-center'}`}>
          <img
            src={aiesecLogo}
            alt="AIESEC"
            className={`${isSidebarOpen ? 'h-8' : 'h-10'} w-auto object-contain`}
          />
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-lg text-sm transition-all group overflow-hidden ${isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-3'
                  } ${isActive
                    ? 'text-foreground bg-surface-elevated shadow-soft'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated/60'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-popover border border-border text-foreground text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-elegant whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-border/50">
          <AnimatePresence>
            {isSidebarOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/50"
              >
                <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                  <LifeBuoy className="size-4 text-primary" />
                </div>
                <div className="text-sm font-medium">Need help?</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Karachi Entity support 24/7.
                </div>
                <button className="mt-3 w-full text-[11px] font-semibold py-2 rounded-md bg-foreground/5 hover:bg-foreground/10 transition-colors">
                  Contact support
                </button>
              </motion.div>
            ) : (
              <div className="flex justify-center">
                <button className="size-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                  <LifeBuoy size={18} />
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
          <div className="flex items-center gap-4 px-6 lg:px-8 h-16">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-md">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  placeholder="Search analytics, ratios, financials..."
                  className="w-full h-10 pl-9 pr-16 rounded-lg bg-surface border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 transition-all"
                />
                <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 h-5 text-[10px] font-medium text-muted-foreground bg-foreground/5 border border-border rounded">
                  <Command className="size-2.5" />K
                </kbd>
              </div>
            </div>

            <div className="flex-1 md:hidden font-semibold tracking-tight truncate">
              {navItems.find(i => i.to === location.pathname)?.label || "Overview"}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="size-9 rounded-lg bg-surface border border-border hover:bg-surface-elevated flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              >
                {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
              </button>

              <button className="relative size-9 rounded-lg bg-surface border border-border hover:bg-surface-elevated flex items-center justify-center transition-colors">
                <Bell className="size-[16px] text-muted-foreground" strokeWidth={1.75} />
                <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-primary" />
              </button>

              {user ? (
                <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-border/50">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold leading-tight">{user.username}</div>
                    <div className="text-[10px] text-blue-500 font-bold tracking-widest uppercase leading-tight mt-0.5">{user.role}</div>
                  </div>
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen((v) => !v)}
                      className="size-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-glow"
                      aria-label="Profile menu"
                      title="Profile"
                    >
                      {user.username?.slice(0, 2)?.toUpperCase()}
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-popover shadow-elegant overflow-hidden">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            window.sessionStorage.setItem('post_logout_redirect', '/');
                            logout();
                            navigate('/', { replace: true });
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-surface-elevated transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="h-9 px-4 rounded-lg bg-surface border border-border hover:bg-surface-elevated flex items-center justify-center transition-colors text-xs font-semibold"
                >
                  Login
                </NavLink>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto relative grid-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
          <div className="max-w-[1400px] mx-auto p-6 lg:p-10 relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
