"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "lg",
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl transition-all z-10",
          maxWidthClasses,
          className
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        {(title || description) && (
          <div className="mb-5 space-y-1.5 pr-6">
            {title && <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-slate-400">{description}</p>}
          </div>
        )}

        {/* Content */}
        <div className="py-2 text-slate-200">{children}</div>

        {/* Footer */}
        {footer && <div className="mt-6 flex justify-end gap-3 border-t border-slate-800/80 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
