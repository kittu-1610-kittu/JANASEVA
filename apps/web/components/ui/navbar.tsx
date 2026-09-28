"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Flame,
  LayoutDashboard,
  MapPin,
  FileText,
  Gift,
  Bot,
  LogIn,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: "/citizen/complaints/new", label: "File Grievance", icon: <FileText className="h-4 w-4" /> },
    { href: "/citizen/welfare", label: "Welfare Schemes", icon: <Gift className="h-4 w-4" /> },
    { href: "/admin/map", label: "GIS Tactical Map", icon: <MapPin className="h-4 w-4" /> },
    { href: "/admin/dashboard", label: "Operations Hub", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/assistant", label: "AI Command", icon: <Bot className="h-4 w-4" /> },
    { href: "/design-system", label: "Design System", icon: <Compass className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-800/80 transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-indigo-500 shadow-md shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-all duration-300">
              <span className="font-extrabold text-white text-base tracking-wider">JS</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-brand-200 to-brand-400 bg-clip-text text-transparent group-hover:from-brand-300 group-hover:to-white transition-all">
                  JANASEVA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                District Public Service Platform
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    isActive
                      ? "bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  )}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Emergency Quick Action Button */}
          <Link href="/citizen/emergency">
            <Button
              variant="emergency"
              size="sm"
              leftIcon={<Flame className="h-3.5 w-3.5 text-white animate-pulse" />}
              className="text-xs font-bold px-3 shadow-rose-600/30"
            >
              <span className="hidden sm:inline">SOS Emergency</span>
              <span className="sm:hidden">SOS</span>
            </Button>
          </Link>

          {/* District Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Ballari District Live</span>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Login / Auth Portal */}
          <Link href="/login" className="hidden sm:inline-flex">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LogIn className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Sign In
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/80 bg-slate-950/95 px-4 pt-3 pb-6 space-y-2 backdrop-blur-xl animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full text-xs" leftIcon={<LogIn className="h-4 w-4" />}>
                Staff & Citizen Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
