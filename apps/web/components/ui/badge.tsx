import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-slate-700/60 bg-slate-800/80 text-slate-200",
        critical:
          "border border-red-500/40 bg-red-500/15 text-red-300",
        high:
          "border border-orange-500/40 bg-orange-500/15 text-orange-300",
        medium:
          "border border-amber-500/40 bg-amber-500/15 text-amber-300",
        low:
          "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        emergency:
          "border border-rose-500/50 bg-rose-500/20 text-rose-200 animate-pulse",
        success:
          "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        warning:
          "border border-amber-500/40 bg-amber-500/15 text-amber-300",
        info:
          "border border-brand-500/40 bg-brand-500/15 text-brand-300",
        outline:
          "border border-slate-700 text-slate-300",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot = true, children, ...props }: BadgeProps) {
  const getDotColor = () => {
    switch (variant) {
      case "critical":
      case "emergency":
        return "bg-rose-400 animate-ping-slow";
      case "high":
        return "bg-orange-400";
      case "medium":
      case "warning":
        return "bg-amber-400";
      case "low":
      case "success":
        return "bg-emerald-400";
      case "info":
        return "bg-brand-400";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", getDotColor())} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
