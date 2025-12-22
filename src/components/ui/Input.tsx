import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses =
      'block w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm placeholder-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const stateClasses = error
      ? 'border-destructive focus:border-destructive focus:ring-destructive'
      : 'border-input focus:border-primary focus:ring-ring';

    const classes = `${baseClasses} ${stateClasses} ${className}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={classes} {...props} />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
