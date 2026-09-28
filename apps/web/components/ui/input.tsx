import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner backdrop-blur-sm transition-all duration-200",
              "focus:border-brand-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/25",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[96px] w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner backdrop-blur-sm transition-all duration-200",
            "focus:border-brand-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/25",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
