/**
 * Critical Orders Table Component
 * Shows overdue and at-risk orders with status indicators
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CriticalOrder } from '@/types/production';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertCircle, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

interface CriticalOrdersTableProps {
  orders: CriticalOrder[];
  loading?: boolean;
  maxItems?: number;
}

const STATUS_CONFIG = {
  overdue: {
    label: 'Überfällig',
    icon: AlertCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  at_risk: {
    label: 'Gefährdet',
    icon: AlertTriangle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  on_track: {
    label: 'Im Plan',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function CriticalOrdersTable({
  orders,
  loading = false,
  maxItems = 5,
}: CriticalOrdersTableProps) {
  const navigate = useNavigate();

  const displayOrders = useMemo(() => {
    return orders.slice(0, maxItems);
  }, [orders, maxItems]);

  const handleRowClick = (order: CriticalOrder) => {
    // Navigate to comparison view with search filter
    navigate(`/production/comparison?search=${encodeURIComponent(order.projektnummer)}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kritische Aufträge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Kritische Aufträge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-sm font-medium text-foreground">
              Keine kritischen Aufträge
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alle Aufträge sind im Plan
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Kritische Aufträge
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {orders.length} {orders.length === 1 ? 'Auftrag' : 'Aufträge'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {displayOrders.map((order) => {
            const config = STATUS_CONFIG[order.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={order.id}
                onClick={() => handleRowClick(order)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                {/* Status indicator */}
                <div className={`p-1.5 rounded-md ${config.bgColor}`}>
                  <StatusIcon className={`h-4 w-4 ${config.textColor}`} />
                </div>

                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground truncate">
                      {order.projektnummer}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.textColor}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {order.name}
                  </p>
                </div>

                {/* Due date / delay */}
                <div className="text-right shrink-0">
                  <div className="text-sm text-foreground">
                    {order.status === 'overdue' ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        +{order.delayDays} {order.delayDays === 1 ? 'Tag' : 'Tage'}
                      </span>
                    ) : (
                      <span>Fällig: {formatDate(order.dueDate)}</span>
                    )}
                  </div>
                  {order.hoursVariance !== undefined && order.hoursVariance !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      {order.hoursVariance > 0 ? '+' : ''}
                      {order.hoursVariance.toFixed(1)}h
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>

        {/* Show more link */}
        {orders.length > maxItems && (
          <div className="px-4 py-2 border-t border-border">
            <button
              onClick={() => navigate('/production/comparison')}
              className="text-xs text-primary hover:underline"
            >
              Alle {orders.length} anzeigen
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
