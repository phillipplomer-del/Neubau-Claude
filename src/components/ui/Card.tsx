import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'muted';
  animate?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', animate = false, children, ...props }, ref) => {
    const baseClasses = 'bg-card text-card-foreground rounded-[var(--radius-card)]';

    const variantClasses = {
      default: 'shadow-[var(--shadow-card)]',
      bordered: 'border border-border/50',
      elevated: 'shadow-[var(--shadow-hover)]',
      muted: 'bg-card-muted',
    };

    const animateClass = animate ? 'card-animate cursor-pointer' : '';

    const classes = `${baseClasses} ${variantClasses[variant]} ${animateClass} ${className}`;

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between px-6 py-4 ${className}`}
        {...props}
      >
        <div>{children}</div>
        {action && <div>{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-base font-semibold text-foreground ${className}`}
        style={{ fontFamily: 'var(--font-display)' }}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-6 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export default Card;
