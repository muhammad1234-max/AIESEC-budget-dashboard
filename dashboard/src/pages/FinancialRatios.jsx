import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { motion } from 'framer-motion';
import { Percent } from 'lucide-react';

void motion;

export default function FinancialRatios() {
  const { data, loading } = useData();

  const ratios = useMemo(() => {
    const source = data?.financialRatios;
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (Array.isArray(source.items)) return source.items;
    return [];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading ratios...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
            Financial Health
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Financial <span className="gradient-text">Ratios</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add and monitor ratios here (profitability, liquidity, efficiency) as the model evolves.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-border bg-card p-6 shadow-soft"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Percent className="size-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Ratio Library</div>
            <div className="text-[11px] text-muted-foreground font-medium">Modular structure for dynamic ratio additions</div>
          </div>
        </div>

        {ratios.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No ratios configured</div>
            <div className="text-xs text-muted-foreground/70 mt-1">This section is ready; ratios can be added via data.json later.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ratios.map((ratio) => (
              <div key={ratio.key || ratio.name} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{ratio.category || 'Ratio'}</div>
                <div className="mt-2 text-base font-semibold text-foreground">{ratio.name}</div>
                <div className="mt-3 text-2xl font-bold text-foreground tabular-nums">{ratio.value ?? '—'}</div>
                {ratio.description && (
                  <div className="mt-2 text-xs text-muted-foreground">{ratio.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
