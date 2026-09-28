import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changePeriod?: string;
  icon?: React.ReactNode;
  variant?: "brand" | "emergency" | "success" | "warning" | "default";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changePeriod = "vs last week",
  icon,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    brand: "border-brand-500/30 bg-gradient-to-br from-brand-950/40 via-slate-900/80 to-slate-900/60 shadow-brand-500/10",
    emergency: "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-900/60 shadow-rose-500/10",
    success: "border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/60 shadow-emerald-500/10",
    warning: "border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-900/60 shadow-amber-500/10",
    default: "border-slate-800/80 bg-slate-900/70",
  }[variant];

  const iconBgStyles = {
    brand: "bg-brand-500/15 text-brand-400 border border-brand-500/30",
    emergency: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    default: "bg-slate-800/80 text-slate-300 border border-slate-700/60",
  }[variant];

  return (
    <div
      className={cn(
        "glass-card card-hover relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur-md",
        variantStyles,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {value}
            </span>
          </div>
        </div>
        {icon && (
          <div className={cn("rounded-xl p-2.5 shadow-inner", iconBgStyles)}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {change !== undefined ? (
          <div className="flex items-center space-x-1">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold",
                change > 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : change < 0
                  ? "bg-rose-500/15 text-rose-400"
                  : "bg-slate-800 text-slate-400"
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              ) : change < 0 ? (
                <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
              ) : (
                <Minus className="mr-0.5 h-3.5 w-3.5" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="text-slate-400">{changePeriod}</span>
          </div>
        ) : subtitle ? (
          <p className="text-slate-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
