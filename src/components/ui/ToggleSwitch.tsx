import { forwardRef, InputHTMLAttributes } from 'react';

export interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ className = '', label, id, disabled, ...props }, ref) => {
    const switchId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <label
        htmlFor={switchId}
        className={`inline-flex items-center gap-2 select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          {/* Track - Apple blue when checked */}
          <div className="w-11 h-6 rounded-full transition-all duration-200 ease-out bg-card-muted border border-border peer-checked:border-transparent peer-checked:bg-[#007AFF] peer-disabled:opacity-50" />
          {/* Thumb - stays white in both modes */}
          <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ease-out peer-checked:translate-x-5" />
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';

export default ToggleSwitch;
