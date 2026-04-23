import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { useData } from '../hooks/useData';
import { motion, useInView } from 'framer-motion';
import { DollarSign, TrendingUp, Percent, Activity, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

void motion;

// Lazy load heavy chart components
const AreaChart = lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart })));
const Area = lazy(() => import('recharts').then(mod => ({ default: mod.Area })));
const XAxis = lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));

const AnimatedCounter = React.memo(({ value, duration = 1.5 }) => {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (isInView) {
      const end = parseInt(value.toString().replace(/[^0-9]/g, ''));
      if (isNaN(end)) return;

      const totalMiliseconds = duration * 1000;
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / totalMiliseconds, 1);
        const currentCount = Math.floor(progress * end);

        setCount(currentCount);

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        }
      };

      requestAnimationFrame(updateCount);
    }
  }, [value, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
});

const Card = React.memo(({ title, value, subtext, icon: Icon, delay, trend, color, onClick, sparkData }) => {
  const Arrow = trend > 0 ? ArrowUpRight : ArrowDownRight;
  const IconComponent = Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer ${onClick ? 'active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="size-9 rounded-lg bg-foreground/5 flex items-center justify-center">
          <IconComponent className="size-[16px] text-muted-foreground" strokeWidth={1.75} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-md ${trend > 0 ? "text-primary bg-primary/10" : "text-rose-500 bg-rose-500/10"
            }`}>
            <Arrow className="size-3" strokeWidth={2.5} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase">
          {title}
        </div>
        <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
          {typeof value === 'string' && value.includes('PKR') ? (
            <>PKR <AnimatedCounter value={value} /></>
          ) : (
            <AnimatedCounter value={value} />
          )}
        </div>
      </div>

      {sparkData && (
        <div className="mt-4 -mx-5 -mb-5 h-14 opacity-60 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#spark-${title})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!sparkData && (
        <p className="text-[11px] text-muted-foreground mt-4 font-medium flex items-center gap-1.5">
          <span className={`w-1 h-1 rounded-full ${trend > 0 ? 'bg-primary' : 'bg-muted'}`} />
          {subtext}
        </p>
      )}
    </motion.div>
  );
});

export default function Dashboard() {
  const { data, loading } = useData();
  const navigate = useNavigate();

  const sumTree = useCallback((nodes, key, month) => {
    if (!Array.isArray(nodes)) return 0;
    return nodes.reduce((acc, node) => {
      const bucket = node?.[key];
      if (!bucket) return acc;
      if (month) return acc + Number(bucket.values?.[month] || 0);
      return acc + Number(bucket.total || 0);
    }, 0);
  }, []);

  const flattenLeaves = useCallback((nodes, pathParts = []) => {
    const rows = [];

    const walk = (node, parts) => {
      const next = [...parts, node.name];
      if (!node.children || node.children.length === 0) {
        rows.push({ path: next.join(' / '), budget: node.budget?.total || 0, actual: node.actual?.total || 0 });
        return;
      }
      node.children.forEach((c) => walk(c, next));
    };

    (nodes || []).forEach((n) => walk(n, pathParts));
    return rows;
  }, []);

  const handleExport = useCallback(() => {
    if (!data) return;

    const csvRows = [['Type', 'Path', 'Budget Total', 'Actual Total', 'Variance']];

    const revLeaves = flattenLeaves(data.financials?.revenues || []);
    const costLeaves = flattenLeaves(data.financials?.costs || []);

    revLeaves.forEach((row) => {
      csvRows.push(['Revenue', row.path, row.budget, row.actual, row.actual - row.budget]);
    });
    costLeaves.forEach((row) => {
      csvRows.push(['Cost', row.path, row.budget, row.actual, row.actual - row.budget]);
    });

    const csvString = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AIESEC_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, flattenLeaves]);

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      totalBudgetCost: sumTree(data.financials?.costs, 'budget'),
      totalActualCost: sumTree(data.financials?.costs, 'actual'),
      totalBudgetRev: sumTree(data.financials?.revenues, 'budget'),
      totalActualRev: sumTree(data.financials?.revenues, 'actual')
    };
  }, [data, sumTree]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    return months.map(month => {
      const budgetRev = sumTree(data.financials?.revenues, 'budget', month);
      const actualRev = sumTree(data.financials?.revenues, 'actual', month);
      return { name: month, Target: budgetRev, Actual: actualRev };
    });
  }, [data, sumTree]);

  // Generate sparkline data from chartData
  const revenueSpark = useMemo(() => chartData.map((d, i) => ({ i, v: d.Actual })), [chartData]);
  const budgetSpark = useMemo(() => chartData.map((d, i) => ({ i, v: d.Target })), [chartData]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Syncing finance data...</p>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
              Live Overview
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Financial <span className="gradient-text">Performance</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of AIESEC Karachi entity's financial health.</p>
        </div>

        <button onClick={handleExport} className="btn-primary">
          <ExternalLink size={14} />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Revenue"
          value={`PKR ${totals.totalActualRev}`}
          subtext={`Target: PKR ${totals.totalBudgetRev.toLocaleString()}`}
          icon={DollarSign}
          delay={0.1}
          trend={12}
          color="var(--primary)"
          sparkData={revenueSpark}
          onClick={() => navigate('/financials')}
        />
        <Card
          title="Costs"
          value={`PKR ${totals.totalActualCost}`}
          subtext={`Budget: PKR ${totals.totalBudgetCost.toLocaleString()}`}
          icon={TrendingUp}
          delay={0.2}
          trend={-4}
          color="var(--accent)"
          sparkData={budgetSpark}
          onClick={() => navigate('/financials')}
        />
        <Card
          title="Net Profit"
          value={`PKR ${totals.totalActualRev - totals.totalActualCost}`}
          subtext={totals.totalActualRev >= totals.totalActualCost ? "Above target" : "Below target"}
          icon={Activity}
          delay={0.3}
          trend={8}
          color="var(--primary)"
          onClick={() => navigate('/financials')}
        />
        <Card
          title="Ratios"
          value={Array.isArray(data.financialRatios) ? data.financialRatios.length : (data.financialRatios?.items?.length || 0)}
          subtext="Financial ratio library"
          icon={Percent}
          delay={0.4}
          trend={0}
          color="var(--accent)"
          onClick={() => navigate('/financial-ratios')}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold tracking-tight text-foreground text-lg">Revenue Trajectory</h3>
              <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                12 Months
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comparison between targeted revenue and actual realizations.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-accent" />
              <span className="text-xs font-medium text-muted-foreground">Target</span>
            </div>
          </div>
        </div>

        <div className="h-80 -ml-2">
          <Suspense fallback={<div className="w-full h-full bg-surface/20 animate-pulse rounded-xl" />}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-target" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ stroke: "oklch(1 0 0 / 0.1)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-elegant)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)", fontWeight: 'bold', marginBottom: 4 }}
                  formatter={(v) => `PKR ${Number(v).toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="Actual"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#g-actual)"
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="Target"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#g-target)"
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
