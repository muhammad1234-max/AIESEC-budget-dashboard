import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

void motion;

export default function Financials() {
    const { data, loading } = useData();
    const [activeTab, setActiveTab] = useState('revenues');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('All');

    const months = ['All', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

    const nodes = useMemo(() => {
        if (!data) return [];
        const tree = data.financials?.[activeTab];
        return Array.isArray(tree) ? tree : [];
    }, [data, activeTab]);

    const filteredNodes = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return nodes;

        const filterNode = (node, pathParts) => {
            const currentPathParts = [...pathParts, node.name];
            const pathText = currentPathParts.join(' / ').toLowerCase();
            const matchesSelf = pathText.includes(query);

            if (!node.children?.length) {
                return matchesSelf ? node : null;
            }

            const nextChildren = node.children
                .map((child) => filterNode(child, currentPathParts))
                .filter(Boolean);

            if (matchesSelf || nextChildren.length) {
                return { ...node, children: nextChildren };
            }

            return null;
        };

        return nodes.map((n) => filterNode(n, [])).filter(Boolean);
    }, [nodes, searchQuery]);

    const flattenLeaves = useCallback((list) => {
        const rows = [];
        const walk = (node, pathParts) => {
            const nextPathParts = [...pathParts, node.name];
            if (!node.children?.length) {
                const budget = selectedMonth === 'All' ? (node.budget?.total || 0) : (node.budget?.values?.[selectedMonth] || 0);
                const actual = selectedMonth === 'All' ? (node.actual?.total || 0) : (node.actual?.values?.[selectedMonth] || 0);
                rows.push({
                    path: nextPathParts.join(' / '),
                    budget,
                    actual
                });
                return;
            }
            node.children.forEach((child) => walk(child, nextPathParts));
        };
        list.forEach((n) => walk(n, []));
        return rows;
    }, [selectedMonth]);

    const handleExportCSV = useCallback(() => {
        const rows = flattenLeaves(filteredNodes).map((r) => {
            const variance = r.actual - r.budget;
            const variancePct = r.budget > 0 ? ((variance / r.budget) * 100).toFixed(1) + '%' : '0.0%';
            return [r.path, r.budget, r.actual, variance, variancePct];
        });

        const headers = ['Path', 'Budgeted', 'Actual', 'Variance', 'Variance %'];
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AIESEC-Financials-${activeTab}-${selectedMonth}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredNodes, activeTab, selectedMonth, flattenLeaves]);

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading ledger...</p>
        </div>
    );

    if (!data) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">Financial Ledger</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Statement <span className="gradient-text">Details</span></h1>
                    <p className="text-sm text-muted-foreground mt-1">Granular breakdown of transactions and budget variances.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search descriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40 w-64 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border">
                        {['revenues', 'costs'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-4 h-8 text-xs font-semibold rounded-md transition-colors uppercase tracking-wider ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="tab-pill"
                                        className="absolute inset-0 bg-surface-elevated rounded-md border border-border shadow-soft"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative">{tab}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
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

                    <button onClick={handleExportCSV} className="btn-primary h-10 px-4">
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft"
            >
                <div className="border-b border-border bg-surface/30 px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <div className="col-span-4">Category</div>
                        <div className="col-span-2 text-right">Budgeted</div>
                        <div className="col-span-2 text-right">Actual</div>
                        <div className="col-span-2 text-right">Variance</div>
                        <div className="col-span-2 text-right">Variance %</div>
                    </div>
                </div>

                <div className="divide-y divide-border/50">
                    {filteredNodes.length === 0 ? (
                        <div className="px-6 py-20 text-center">
                            <div className="size-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
                                <Filter className="size-6 text-muted-foreground/40" />
                            </div>
                            <div className="text-muted-foreground font-bold text-sm uppercase tracking-widest">No matching records</div>
                            <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting your search.</p>
                        </div>
                    ) : (
                        <Tree nodes={filteredNodes} selectedMonth={selectedMonth} />
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function Tree({ nodes, selectedMonth }) {
    const [open, setOpen] = React.useState(() => new Set());

    const toggle = useCallback((key) => {
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const formatMoney = useCallback((n) => {
        return `PKR ${Number(n || 0).toLocaleString()}`;
    }, []);

    const renderNode = useCallback(function renderNodeInner(node, depth, pathKey) {
        const key = pathKey ? `${pathKey}/${node.name}` : node.name;
        const hasChildren = !!node.children?.length;
        const isOpen = open.has(key) || depth === 0;

        const budget = selectedMonth === 'All' ? (node.budget?.total || 0) : (node.budget?.values?.[selectedMonth] || 0);
        const actual = selectedMonth === 'All' ? (node.actual?.total || 0) : (node.actual?.values?.[selectedMonth] || 0);
        const variance = actual - budget;
        const isPositive = variance >= 0;
        const variancePct = budget > 0 ? ((variance / budget) * 100).toFixed(1) + '%' : '0.0%';

        return (
            <div key={key}>
                <div
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-surface/30 transition-colors ${depth === 0 ? 'bg-surface/10' : ''
                        }`}
                >
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <div style={{ width: depth * 14 }} className="shrink-0" />
                        {hasChildren && (
                            <button
                                onClick={() => toggle(key)}
                                className="size-7 rounded-md bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                aria-label={isOpen ? 'Collapse' : 'Expand'}
                            >
                                <span className="text-sm font-bold leading-none">{isOpen ? '−' : '+'}</span>
                            </button>
                        )}
                        <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{node.name}</div>
                            {!hasChildren && (
                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Leaf</div>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2 text-right font-medium text-muted-foreground tabular-nums text-sm flex items-center justify-end">
                        {formatMoney(budget)}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-foreground tabular-nums text-sm flex items-center justify-end">
                        {formatMoney(actual)}
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end">
                        <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${isPositive ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                                }`}
                        >
                            {isPositive ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
                            {isPositive ? '+' : ''}{variance.toLocaleString()}
                        </div>
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end">
                        <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${isPositive ? 'text-primary' : 'text-rose-500'
                                }`}
                        >
                            {isPositive ? '+' : ''}{variancePct}
                        </div>
                    </div>
                </div>

                {hasChildren && isOpen && (
                    <div>
                        <AnimatePresence initial={false}>
                            {node.children.map((child) => (
                                <motion.div
                                    key={`${key}/${child.name}`}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    {renderNodeInner(child, depth + 1, key)}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        );
    }, [formatMoney, open, toggle, selectedMonth]);

    return <div>{nodes.map((n) => renderNode(n, 0, ''))}</div>;
}
