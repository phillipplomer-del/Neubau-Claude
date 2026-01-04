import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full';

    const variantClasses = {
      default: 'gradient-main text-white',
      success: 'bg-[var(--success)] text-white',
      warning: 'bg-[var(--warning)] text-foreground',
      danger: 'bg-[var(--danger)] text-white',
      info: 'bg-[var(--info)] text-white',
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
