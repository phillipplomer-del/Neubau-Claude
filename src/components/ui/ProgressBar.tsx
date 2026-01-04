import { HTMLAttributes, forwardRef } from 'react';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'gradient' | 'mint' | 'teal' | 'cyan' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className = '',
      value,
      max = 100,
      variant = 'gradient',
      size = 'md',
      showLabel = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-1.5',
      lg: 'h-2',
    };

    const variantClasses = {
      gradient: 'gradient-main',
      mint: 'bg-[var(--accent-mint)]',
      teal: 'bg-[var(--accent-teal)]',
      cyan: 'bg-[var(--accent-cyan)]',
      blue: 'bg-[var(--accent-blue)]',
    };

    return (
      <div ref={ref} className={`w-full ${className}`} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{max}</span>
          </div>
        )}
        <div
          className={`w-full bg-card-muted rounded-full overflow-hidden progress-animate ${sizeClasses[size]}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${variantClasses[variant]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
