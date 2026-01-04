import { HTMLAttributes, forwardRef, ReactNode } from 'react';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode;
  value: string | number;
  label: string;
  gradient?: 1 | 2 | 3 | 4;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className = '', icon, value, label, gradient = 1, trend, ...props }, ref) => {
    const gradientClasses = {
      1: 'gradient-card-1',
      2: 'gradient-card-2',
      3: 'gradient-card-3',
      4: 'gradient-card-4',
    };

    return (
      <div
        ref={ref}
        className={`bg-card rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)] stat-card-animate ${className}`}
        {...props}
      >
        <div className="flex items-center gap-4">
          {/* Icon Container */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradientClasses[gradient]}`}
          >
            <span className="text-white">{icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {value}
              </span>
              {trend && (
                <span
                  className={`text-xs font-medium ${
                    trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export default StatCard;
