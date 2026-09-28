import * as React from "react";
import { Check, Clock, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status: "completed" | "current" | "upcoming" | "alert";
  officer?: string;
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn("relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800", className)}>
      {steps.map((step) => {
        const isCompleted = step.status === "completed";
        const isCurrent = step.status === "current";
        const isAlert = step.status === "alert";

        return (
          <div key={step.id} className="relative group">
            {/* Step Icon Indicator */}
            <div
              className={cn(
                "absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-slate-950 transition-all duration-200",
                isCompleted && "bg-emerald-500 text-slate-950",
                isCurrent && "bg-brand-500 text-white ring-brand-500/30 animate-pulse",
                isAlert && "bg-rose-500 text-white ring-rose-500/30 animate-bounce",
                !isCompleted && !isCurrent && !isAlert && "bg-slate-800 border border-slate-700 text-slate-500"
              )}
            >
              {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
              {isCurrent && <Clock className="h-3 w-3 animate-spin text-white" />}
              {isAlert && <ShieldAlert className="h-3 w-3" />}
              {!isCompleted && !isCurrent && !isAlert && <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />}
            </div>

            {/* Step Content */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 transition-all duration-200 hover:border-slate-700/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    isCurrent ? "text-brand-400" : isCompleted ? "text-slate-100" : "text-slate-400"
                  )}
                >
                  {step.title}
                </h4>
                {step.date && (
                  <span className="text-xs text-slate-500 font-mono">
                    {step.date}
                  </span>
                )}
              </div>

              {step.description && (
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              )}

              {step.officer && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/40 w-fit px-2.5 py-1 rounded-md border border-slate-700/50">
                  <span className="text-slate-500">Handled by:</span>
                  <span className="font-medium text-slate-300">{step.officer}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
