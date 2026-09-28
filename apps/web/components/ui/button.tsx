import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-600 text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/30",
        primary:
          "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25 hover:from-brand-500 hover:to-indigo-500 hover:shadow-brand-500/40",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700/80 border border-slate-700/60 shadow-sm",
        outline:
          "border border-slate-700/80 bg-slate-900/40 text-slate-200 hover:bg-slate-800/80 hover:border-slate-600",
        ghost:
          "text-slate-300 hover:bg-slate-800/60 hover:text-white",
        destructive:
          "bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-500 hover:shadow-red-600/30",
        emergency:
          "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-red-500 animate-pulse",
        success:
          "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-600/30",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {!isLoading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
