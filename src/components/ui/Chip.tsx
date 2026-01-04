import { HTMLAttributes, forwardRef } from 'react';

export interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md';
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className = '', active = false, size = 'md', children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-[var(--radius-chip)] chip-animate cursor-pointer border-none outline-none';

    const sizeClasses = {
      sm: 'h-7 px-3 text-xs',
      md: 'h-8 px-4 text-xs',
    };

    const stateClasses = active
      ? 'gradient-main text-white shadow-[var(--shadow-chip)]'
      : 'bg-card text-muted-foreground shadow-[var(--shadow-chip)] hover:text-foreground';

    const classes = `${baseClasses} ${sizeClasses[size]} ${stateClasses} ${className}`;

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';

export default Chip;
