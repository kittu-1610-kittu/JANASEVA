"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "default";
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  size = "default",
}: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-800 backdrop-blur-md shadow-inner",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              isActive
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/25 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            )}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-slate-400"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
