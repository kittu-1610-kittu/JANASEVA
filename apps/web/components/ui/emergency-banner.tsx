"use client";

import * as React from "react";
import Link from "next/link";
import { Siren, PhoneCall, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmergencyBannerProps {
  title?: string;
  message?: string;
  hotline?: string;
  href?: string;
  className?: string;
  dismissible?: boolean;
}

export function EmergencyBanner({
  title = "DISTRICT EMERGENCY ALERT",
  message = "Severe flash flood warning in Ballari North (Wards 12-18). EOC response units deployed.",
  hotline = "112 / 1077",
  href = "/citizen/emergency",
  className,
  dismissible = true,
}: EmergencyBannerProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center justify-between gap-3 border-b border-rose-500/40 bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90 px-4 py-2.5 text-xs text-rose-100 shadow-lg backdrop-blur-md transition-all",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600/30 text-rose-300 ring-1 ring-rose-500/50 animate-pulse">
          <Siren className="h-4 w-4 text-rose-200" />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold tracking-wider uppercase text-rose-200 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
            {title}
          </span>
          <span className="text-rose-100 font-medium">{message}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-rose-200 bg-rose-900/40 px-2.5 py-1 rounded-md border border-rose-800/60">
          <PhoneCall className="h-3 w-3 text-rose-400" />
          <span className="font-mono font-bold tracking-wide">{hotline}</span>
        </div>

        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 font-semibold text-white hover:text-rose-200 transition-colors underline-offset-4 hover:underline"
          >
            <span>Live EOC Updates</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}

        {dismissible && (
          <button
            onClick={() => setVisible(false)}
            className="rounded p-1 text-rose-300 hover:bg-rose-800/50 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
}
