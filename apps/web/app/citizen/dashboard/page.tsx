"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api";

interface Complaint {
  id: string;
  complaint_id: string;
  title: string;
  status: string;
  priority: string;
  category_code: string | null;
  is_emergency: boolean;
  sla_breached: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  REPORTED: "bg-gray-700 text-gray-200",
  AI_CLASSIFIED: "bg-blue-900/50 text-blue-300",
  VERIFIED: "bg-cyan-900/50 text-cyan-300",
  ASSIGNED: "bg-indigo-900/50 text-indigo-300",
  IN_PROGRESS: "bg-yellow-900/50 text-yellow-300",
  EVIDENCE_SUBMITTED: "bg-orange-900/50 text-orange-300",
  OFFICER_VERIFIED: "bg-teal-900/50 text-teal-300",
  RESOLVED: "bg-green-900/50 text-green-300",
  CITIZEN_FEEDBACK: "bg-emerald-900/50 text-emerald-300",
  ESCALATED: "bg-red-900/50 text-red-300",
  REJECTED: "bg-gray-800 text-gray-400",
  DUPLICATE: "bg-gray-800 text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "badge-critical",
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-700 text-gray-300"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <Link
      href={`/citizen/complaints/${complaint.id}`}
      className="block bg-gray-900 border border-white/10 rounded-xl p-5 hover:border-indigo-500/30 hover:bg-gray-800/50 transition-all group"
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-indigo-400">{complaint.complaint_id}</span>
            {complaint.is_emergency && (
              <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded font-medium">🚨 EMERGENCY</span>
            )}
            {complaint.sla_breached && (
              <span className="text-xs bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded font-medium">⏰ SLA BREACHED</span>
            )}
          </div>
          <h3 className="font-medium text-white text-sm leading-snug group-hover:text-indigo-300 transition-colors line-clamp-1">
            {complaint.title}
          </h3>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {complaint.category_code && (
            <span className="text-xs text-gray-500">{complaint.category_code.replace(/_/g, " ")}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[complaint.priority] ?? ""}`}>
            {complaint.priority}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
}

export default function CitizenDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["complaints", "my"],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: { page_size: 10 } });
      return res.data as { items: Complaint[]; total: number };
    },
  });

  const stats = [
    { label: "Total Submitted", value: data?.total ?? 0, color: "text-indigo-400" },
    { label: "In Progress", value: data?.items.filter(c => ["ASSIGNED", "IN_PROGRESS", "FIELD_VISIT"].includes(c.status)).length ?? 0, color: "text-yellow-400" },
    { label: "Resolved", value: data?.items.filter(c => c.status === "RESOLVED").length ?? 0, color: "text-green-400" },
    { label: "SLA Breaches", value: data?.items.filter(c => c.sla_breached).length ?? 0, color: "text-red-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
              JS
            </div>
            <span className="font-semibold text-sm">JANASEVA OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/citizen/emergency"
              className="bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              🚨 SOS Emergency
            </Link>
            <Link
              href="/citizen/complaints/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors"
            >
              + New Complaint
            </Link>
            <Link href="/citizen/welfare" className="text-xs text-gray-400 hover:text-white transition-colors">Schemes</Link>
            <Link href="/login" className="text-xs text-gray-400 hover:text-white transition-colors">Sign out</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">My Complaints</h1>
          <p className="text-gray-400 text-sm">Track the status of your submitted complaints.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-white/10 rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Complaints List */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">Unable to load complaints.</p>
            <button
              onClick={() => refetch()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="text-center py-16 bg-gray-900 border border-white/10 rounded-2xl">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold mb-2">No complaints yet</h3>
            <p className="text-gray-400 text-sm mb-6">Submit your first complaint to get started.</p>
            <Link
              href="/citizen/complaints/new"
              className="inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
            >
              Report an Issue
            </Link>
          </div>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
            {data.total > 10 && (
              <Link
                href="/citizen/complaints"
                className="block text-center text-sm text-indigo-400 hover:text-indigo-300 py-3 transition-colors"
              >
                View all {data.total} complaints →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
