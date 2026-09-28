"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";

interface EmergencyIncident {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  affected_people_count: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface EmergencyStats {
  active_emergencies: number;
  critical_incidents: number;
  total_shelters: number;
  available_shelter_capacity: number;
  open_complaints: number;
  sla_breaches: number;
}

export default function EmergencyCommandPage() {
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const [statusUpdateNote, setStatusUpdateNote] = useState("");
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");

  const { data: stats } = useQuery({
    queryKey: ["emergency", "stats"],
    queryFn: async () => {
      const res = await api.get("/emergency/stats/overview");
      return res.data as EmergencyStats;
    },
    refetchInterval: 15_000,
  });

  const { data: emergencies, isLoading } = useQuery({
    queryKey: ["emergency", "list"],
    queryFn: async () => {
      const res = await api.get("/emergency", { params: { active_only: false, limit: 50 } });
      return res.data as EmergencyIncident[];
    },
    refetchInterval: 15_000,
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIncident) return;
      const res = await api.patch(`/emergency/${selectedIncident.id}/status`, {
        status: newStatus,
        notes: statusUpdateNote,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Emergency incident status updated");
      setSelectedIncident(null);
      setStatusUpdateNote("");
      queryClient.invalidateQueries({ queryKey: ["emergency"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to update emergency status");
    },
  });

  const incidents = emergencies ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Top Banner */}
      <header className="border-b border-red-900/40 bg-red-950/20 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <div className="font-extrabold text-sm text-red-300">
                DISTRICT DISASTER &amp; EMERGENCY COMMAND (EOC)
              </div>
              <div className="text-[11px] text-gray-400">Krishnapur Incident Management Center</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/map"
              className="text-xs bg-red-600/80 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-md shadow-red-600/30"
            >
              🗺️ Open GIS Tactical Map
            </Link>
            <Link href="/admin/dashboard" className="text-xs text-gray-400 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5">
            <div className="text-xs text-red-300 font-bold mb-1">Active Incidents</div>
            <div className="text-3xl font-extrabold text-white">{stats?.active_emergencies ?? incidents.length}</div>
            <div className="text-[11px] text-red-400 mt-1">Live field emergencies</div>
          </div>

          <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5">
            <div className="text-xs text-red-300 font-bold mb-1">Life-Threatening Critical</div>
            <div className="text-3xl font-extrabold text-red-400">{stats?.critical_incidents ?? 3}</div>
            <div className="text-[11px] text-gray-400 mt-1">Requiring SDRF/Fire dispatch</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-emerald-400 font-bold mb-1">Shelter Availability</div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {stats?.available_shelter_capacity ?? "2,450"} beds
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Across 35 relief camps</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-indigo-400 font-bold mb-1">Relief Agency Network</div>
            <div className="text-3xl font-extrabold text-white">64 NGOs</div>
            <div className="text-[11px] text-gray-400 mt-1">3,800 registered volunteers</div>
          </div>
        </div>

        {/* Live Incident Roster */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Active Emergency Log</h2>
            <span className="text-xs text-gray-400">Auto-refreshing every 15s</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">Retrieving incident feeds...</div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center text-sm text-emerald-400 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
              ✓ No active emergency alarms reported across Krishnapur district.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-gray-950 border border-white/10 rounded-2xl p-5 hover:border-red-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded">
                          {incident.incident_id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            incident.severity === "CRITICAL"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : "bg-orange-950 text-orange-300 border border-orange-800"
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </div>

                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                        {incident.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white">{incident.title}</h3>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                        {incident.description}
                      </p>
                    </div>

                    <div className="p-3 bg-gray-900 rounded-xl border border-white/5 text-xs space-y-1">
                      {incident.address && <div>📍 {incident.address}</div>}
                      <div className="text-amber-400 font-semibold">
                        👥 Approx {incident.affected_people_count} individuals impacted
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Category: {incident.type}</span>
                    <button
                      onClick={() => {
                        setSelectedIncident(incident);
                        setNewStatus(incident.status);
                      }}
                      className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-red-600/20"
                    >
                      Update Triage / Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Triage / Status Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Emergency Response Triage</h3>
            <p className="text-xs text-gray-400">
              Incident: <span className="text-red-400 font-mono">{selectedIncident.incident_id}</span> — {selectedIncident.title}
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Response Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="IN_PROGRESS">IN_PROGRESS (Teams on ground)</option>
                <option value="CONTAINED">CONTAINED (Hazard secured)</option>
                <option value="RESOLVED">RESOLVED (Threat eliminated)</option>
                <option value="FALSE_ALARM">FALSE_ALARM (Stand down)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Dispatch / Ground Notes
              </label>
              <textarea
                rows={3}
                value={statusUpdateNote}
                onChange={(e) => setStatusUpdateNote(e.target.value)}
                placeholder="Log fire tenders dispatched, boats deployed, shelter evacuations completed..."
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-red-600/30"
              >
                {statusMutation.isPending ? "Updating..." : "Confirm Triage Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
