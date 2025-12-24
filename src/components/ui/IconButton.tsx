import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'gradient';
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', size = 'md', variant = 'default', children, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-full icon-btn-animate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const sizeClasses = {
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-11 w-11',
    };

    const variantClasses = {
      default: 'bg-card-muted text-muted-foreground hover:text-foreground',
      ghost: 'bg-transparent text-muted-foreground hover:bg-card-muted hover:text-foreground',
      gradient: 'gradient-main text-white',
    };

    const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
