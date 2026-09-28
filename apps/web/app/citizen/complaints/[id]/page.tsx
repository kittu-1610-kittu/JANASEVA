"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";

const STEPS = [
  { key: "REPORTED", label: "Reported", desc: "Citizen intake" },
  { key: "AI_CLASSIFIED", label: "AI Processed", desc: "Category suggested" },
  { key: "VERIFIED", label: "Verified", desc: "Officer accepted" },
  { key: "ASSIGNED", label: "Assigned", desc: "Field worker assigned" },
  { key: "IN_PROGRESS", label: "In Progress", desc: "Work underway" },
  { key: "EVIDENCE_SUBMITTED", label: "Evidence", desc: "Resolution proof" },
  { key: "RESOLVED", label: "Resolved", desc: "Issue closed" },
];

const STATUS_RANK: Record<string, number> = {
  REPORTED: 0,
  AI_CLASSIFIED: 1,
  VERIFIED: 2,
  ASSIGNED: 3,
  FIELD_VISIT: 3.5,
  IN_PROGRESS: 4,
  EVIDENCE_SUBMITTED: 5,
  OFFICER_VERIFIED: 5.5,
  RESOLVED: 6,
  CITIZEN_FEEDBACK: 7,
};

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const { data: complaint, isLoading, isError } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const res = await api.get(`/complaints/${id}`);
      return res.data;
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/complaints/${id}/feedback`, {
        rating,
        feedback,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Thank you! Your feedback has been recorded.");
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to submit feedback");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-sm">Loading complaint details...</div>
      </div>
    );
  }

  if (isError || !complaint) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/citizen/dashboard" className="text-indigo-400 text-sm hover:underline">
            ← Back to Dashboard
          </Link>
          <div className="mt-8 p-6 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-200">
            Complaint not found or you do not have permission to view it.
          </div>
        </div>
      </div>
    );
  }

  const currentRank = STATUS_RANK[complaint.status] ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/citizen/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Dashboard
            </Link>
            <span className="text-gray-600">/</span>
            <span className="font-mono text-sm text-indigo-400 font-semibold">{complaint.complaint_id}</span>
          </div>
          <div className="flex items-center gap-3">
            {complaint.is_emergency && (
              <span className="text-xs bg-red-900/60 text-red-300 border border-red-700/50 px-2.5 py-1 rounded-full font-semibold">
                🚨 Emergency
              </span>
            )}
            <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2.5 py-1 rounded-full font-semibold">
              {complaint.priority} Priority
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-8">
        {/* Title & Overview Card */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">
                Submitted {format(new Date(complaint.created_at), "PPP p")} (
                {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })})
              </div>
              <h1 className="text-2xl font-bold text-white">{complaint.title}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {complaint.category_code && (
                  <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg">
                    Category: {complaint.category_code.replace(/_/g, " ")}
                  </span>
                )}
                {complaint.address && (
                  <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg">
                    📍 {complaint.address}
                  </span>
                )}
              </div>
            </div>

            {complaint.sla_deadline && (
              <div className="p-3 bg-gray-800/80 border border-white/10 rounded-xl text-right shrink-0">
                <div className="text-xs text-gray-400">Target Resolution</div>
                <div className="text-sm font-semibold text-white">
                  {format(new Date(complaint.sla_deadline), "MMM d, h:mm a")}
                </div>
                {complaint.sla_breached ? (
                  <span className="inline-block mt-1 text-xs text-red-400 font-semibold">⏰ SLA Breached</span>
                ) : (
                  <span className="inline-block mt-1 text-xs text-green-400">Within Target Window</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">{complaint.description}</p>
          </div>
        </div>

        {/* Live Status Stepper */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-6">Progress &amp; Tracking Lifecycle</h2>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {STEPS.map((step, idx) => {
              const stepRank = STATUS_RANK[step.key] ?? idx;
              const isCompleted = currentRank >= stepRank;
              const isCurrent = complaint.status === step.key;

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20"
                      : isCompleted
                      ? "bg-gray-800/80 border-emerald-500/40 text-gray-200"
                      : "bg-gray-950/50 border-white/5 text-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold">0{idx + 1}</span>
                    {isCompleted ? (
                      <span className="text-emerald-400 text-xs font-bold">✓</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white leading-tight">{step.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution Notes & Feedback */}
        {complaint.resolution_notes && (
          <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900 border border-emerald-800/40 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-2">
              Official Resolution Notes
            </h3>
            <p className="text-sm text-gray-200">{complaint.resolution_notes}</p>
            {complaint.resolved_at && (
              <div className="text-xs text-gray-400 mt-3">
                Resolved on {format(new Date(complaint.resolved_at), "PPP p")}
              </div>
            )}
          </div>
        )}

        {/* Citizen Feedback Form */}
        {(complaint.status === "RESOLVED" || complaint.status === "CITIZEN_FEEDBACK") && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
            <h3 className="text-base font-semibold mb-2">Rate Resolution &amp; Service</h3>
            <p className="text-xs text-gray-400 mb-4">
              Your feedback is used to evaluate department response times and quality.
            </p>

            {complaint.citizen_rating ? (
              <div className="p-4 bg-gray-800/50 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 text-lg">{"★".repeat(complaint.citizen_rating)}</span>
                  <span className="text-sm font-semibold text-white">({complaint.citizen_rating}/5 stars)</span>
                </div>
                {complaint.citizen_feedback && (
                  <p className="text-xs text-gray-300 italic">&ldquo;{complaint.citizen_feedback}&rdquo;</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`w-10 h-10 rounded-xl text-lg font-bold border transition-all ${
                          rating >= star
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-gray-800 border-white/10 text-gray-500"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Feedback Comments (Optional)</label>
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Was the issue resolved satisfactorily? Any comments on field worker response..."
                    className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => feedbackMutation.mutate()}
                  disabled={feedbackMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Evidence Photos */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-4">Evidence &amp; Photographic Proof</h3>
          {complaint.evidence && complaint.evidence.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {complaint.evidence.map((ev: any) => (
                <div key={ev.id} className="bg-gray-950 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="h-32 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                    📷 {ev.file_name}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-mono">{ev.evidence_type}</span>
                    {ev.is_verified && <span className="text-emerald-400 font-medium">✓ Verified</span>}
                  </div>
                  {ev.caption && <p className="text-xs text-gray-300">{ev.caption}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-white/10 rounded-xl">
              No evidence photos uploaded yet. Field workers attach completion photos during verification.
            </div>
          )}
        </div>

        {/* Status History Timeline */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h3 className="text-base font-semibold mb-4">Audit Trail</h3>
          <div className="space-y-4">
            {complaint.status_history?.map((h: any) => (
              <div key={h.id} className="flex gap-4 items-start text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-white font-medium">
                    Status changed to <span className="text-indigo-300 font-bold">{h.to_status}</span>
                    {h.from_status && <span className="text-gray-500"> (from {h.from_status})</span>}
                  </div>
                  {h.notes && <p className="text-gray-400 mt-0.5">{h.notes}</p>}
                </div>
                <div className="text-gray-500 shrink-0">
                  {format(new Date(h.created_at), "MMM d, h:mm a")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
