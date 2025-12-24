import { forwardRef, InputHTMLAttributes } from 'react';

export interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ className = '', label, id, ...props }, ref) => {
    const switchId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <label
        htmlFor={switchId}
        className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="sr-only peer"
            {...props}
          />
          {/* Track */}
          <div className="w-11 h-6 rounded-full transition-all duration-200 ease-out bg-card-muted border border-border peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-[var(--accent-mint)] peer-checked:via-[var(--accent-teal)] peer-checked:to-[var(--accent-blue)] dark:peer-checked:from-[#E0BD00] dark:peer-checked:via-[#9EE000] dark:peer-checked:to-[#45F600]" />
          {/* Thumb */}
          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ease-out peer-checked:translate-x-5 dark:peer-checked:bg-[#1A1A12]" />
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';

export default ToggleSwitch;
