"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-9 rounded-xl border border-slate-800 bg-slate-900/60 p-2", className)} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 shadow-sm transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500",
        className
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-brand-400 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
