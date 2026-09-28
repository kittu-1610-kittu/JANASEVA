import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to conditionally merge Tailwind CSS classes cleanly
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format date into readable Indian localized format
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format relative time string (e.g. '5 mins ago')
 */
export function timeAgo(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
