
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import api, { clearTokens } from "@/lib/api";

interface Complaint {
  id: string;
  complaint_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category_code: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_emergency: boolean;
  sla_breached: boolean;
  sla_deadline: string | null;
  created_at: string;
}

export default function FieldWorkerDashboardPage() {
  const queryClient = useQueryClient();
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [evidenceType, setEvidenceType] = useState("AFTER");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
  });

  const { data: complaintsData, isLoading } = useQuery({
    queryKey: ["field", "complaints"],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: { page_size: 30 } });
      return res.data as { items: Complaint[]; total: number };
    },
  });

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await api.post(`/complaints/${id}/status`, { status, notes });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Ticket ${data.complaint_id} updated to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["field", "complaints"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Status update failed");
    },
  });

  // Evidence upload mutation
  const evidenceMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await api.post(`/complaints/${id}/evidence`, {
        file_name: `field_proof_${Date.now()}.jpg`,
        mime_type: "image/jpeg",
        evidence_type: evidenceType,
        caption: evidenceCaption || "Field work completion proof",
      });
      // Also advance to EVIDENCE_SUBMITTED
      await api.post(`/complaints/${id}/status`, {
        status: "EVIDENCE_SUBMITTED",
        notes: `Evidence attached: ${evidenceCaption}`,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Evidence recorded & submitted for officer verification!");
      setActiveComplaint(null);
      setEvidenceCaption("");
      queryClient.invalidateQueries({ queryKey: ["field", "complaints"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to submit evidence");
    },
  });

  const complaints = complaintsData?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Field Worker Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-md">
              🔧
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Field Worker Portal</div>
              <div className="text-xs text-violet-400">
                {user ? user.full_name : "Field Operations"}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              clearTokens();
              window.location.href = "/login";
            }}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Assigned Tasks Queue</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Review assigned site visits, log ground action, and upload resolution proof.
            </p>
          </div>
          <span className="text-xs bg-violet-950 border border-violet-800/40 text-violet-300 px-3 py-1 rounded-full font-mono font-bold">
            {complaints.length} Tasks
          </span>
        </div>

        {/* Task Cards */}
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading your tasks...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500 border border-dashed border-white/10 rounded-2xl">
            No pending tasks currently assigned.
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="bg-gray-900 border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-violet-400">
                        {c.complaint_id}
                      </span>
                      {c.is_emergency && (
                        <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-bold">
                          🚨 SOS
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.priority === "CRITICAL"
                            ? "bg-red-950 text-red-300"
                            : c.priority === "HIGH"
                              ? "bg-orange-950 text-orange-300"
                              : "bg-blue-950 text-blue-300"
                          }`}
                      >
                        {c.priority}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white">{c.title}</h3>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">{c.description}</p>
                  </div>

                  <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg shrink-0">
                    Status: {c.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Location and SLA info */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 bg-gray-950/60 p-3 rounded-xl border border-white/5">
                  {c.address && <span>📍 {c.address}</span>}
                  {c.sla_deadline && (
                    <span>
                      ⏰ Target: {format(new Date(c.sla_deadline), "MMM d, h:mm a")}
                    </span>
                  )}
                  {c.latitude && c.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:underline"
                    >
                      Open in Maps ↗
                    </a>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 justify-end">
                  {c.status === "ASSIGNED" && (
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          id: c.id,
                          status: "FIELD_VISIT",
                          notes: "Field worker arriving at site",
                        })
                      }
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                    >
                      🚗 Mark Field Visit Started
                    </button>
                  )}

                  {(c.status === "ASSIGNED" || c.status === "FIELD_VISIT") && (
                    <button
                      onClick={() =>
                        statusMutation.mutate({
                          id: c.id,
                          status: "IN_PROGRESS",
                          notes: "Work actively underway on site",
                        })
                      }
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-600/20"
                    >
                      ⚡ Start Work (In Progress)
                    </button>
                  )}

                  {c.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => setActiveComplaint(c)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                    >
                      📷 Attach Evidence &amp; Complete
                    </button>
                  )}

                  <Link
                    href={`/citizen/complaints/${c.id}`}
                    className="border border-white/10 hover:bg-white/5 text-gray-300 text-xs px-3 py-2 rounded-xl transition-colors"
                  >
                    View History
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Evidence Upload Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Attach Evidence / Work Proof</h3>
            <p className="text-xs text-gray-400">
              Ticket: <span className="text-violet-400 font-mono">{activeComplaint.complaint_id}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Evidence Stage
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="AFTER">After / Resolution Completed</option>
                <option value="INSPECTION">Inspection / Site Assessment</option>
                <option value="BEFORE">Before / Initial State</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Photo Evidence Caption &amp; Notes
              </label>
              <textarea
                rows={3}
                value={evidenceCaption}
                onChange={(e) => setEvidenceCaption(e.target.value)}
                placeholder="e.g. Pothole filled with cold mix asphalt and compacted, road clear for traffic."
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 bg-gray-950 rounded-xl border border-dashed border-white/10 text-center">
              <span className="text-xs text-gray-400">
                📷 Synthetic Camera Trigger (Simulates mobile photo capture)
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveComplaint(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => evidenceMutation.mutate({ id: activeComplaint.id })}
                disabled={evidenceMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/30"
              >
                {evidenceMutation.isPending ? "Submitting..." : "Submit Proof to Officer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
