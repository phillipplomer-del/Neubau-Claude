/**
 * Sales Pipeline Funnel Component
 * Shows sales pipeline stages as a horizontal bar/funnel chart
 */

import { useMemo, useState, useEffect } from 'react';
import { formatCurrencyShort } from '@/lib/sales/kpiCalculator';

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

interface SalesPipelineFunnelProps {
  data: PipelineStage[];
  loading?: boolean;
}

// Hook to detect dark mode
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Stage colors
const STAGE_COLORS_LIGHT = [
  '#00DEE0', // cyan - Angebote
  '#00E097', // mint - Aufträge
  '#0050E0', // blue - In Produktion
  '#00B8D4', // teal - Versandbereit
  '#00C9A7', // sea green - Geliefert
];

const STAGE_COLORS_DARK = [
  '#FFAA80', // orange - Angebote
  '#E0BD00', // gold - Aufträge
  '#80FF80', // green - In Produktion
  '#FFD080', // light gold - Versandbereit
  '#9EE000', // lime - Geliefert
];

export default function SalesPipelineFunnel({
  data,
  loading = false,
}: SalesPipelineFunnelProps) {
  const isDark = useDarkMode();
  const COLORS = isDark ? STAGE_COLORS_DARK : STAGE_COLORS_LIGHT;

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  // Total pipeline value
  const totalValue = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  // Total count
  const totalCount = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 h-full animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Pipeline</h3>
        <p className="text-sm text-muted-foreground">
          {totalCount} Positionen · {formatCurrencyShort(totalValue)}
        </p>
      </div>

      {/* Funnel Stages */}
      <div className="flex-1 space-y-2">
        {data.map((stage, index) => {
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const color = COLORS[index % COLORS.length];

          return (
            <div key={stage.stage} className="group">
              {/* Stage label */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {stage.stage}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stage.count}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-7 bg-muted rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all duration-300 group-hover:opacity-80"
                  style={{
                    width: `${Math.max(widthPercent, 2)}%`,
                    backgroundColor: color,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span
                    className="text-xs font-bold"
                    style={{
                      color:
                        widthPercent > 50
                          ? isDark
                            ? '#1a1a1a'
                            : '#ffffff'
                          : 'inherit',
                    }}
                  >
                    {formatCurrencyShort(stage.value)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion hint */}
      {data.length >= 2 && data[0].count > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-medium text-foreground">
              {((data[data.length - 1].count / data[0].count) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
