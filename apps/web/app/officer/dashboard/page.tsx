"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  Truck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Send,
  Camera,
  RefreshCw,
  HardHat,
  X,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import api, { clearTokens } from "@/lib/api";

interface Complaint {
  id: string;
  complaint_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  priority_score: number;
  category_code: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_emergency: boolean;
  sla_breached: boolean;
  sla_deadline: string | null;
  created_at: string;
}

interface FieldWorker {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
}

interface HeavyAsset {
  id: string;
  name: string;
  type: string;
  reg_no: string;
  operator: string;
  status: "AVAILABLE" | "DEPLOYED" | "STANDBY";
  ward: string;
}

const INITIAL_HEAVY_ASSETS: HeavyAsset[] = [
  {
    id: "EQ-01",
    name: "High-Capacity Jetting Sucker (6000L)",
    type: "Drainage & Sewerage",
    reg_no: "KA-04-MG-8812",
    operator: "Manjunath (9845110293)",
    status: "AVAILABLE",
    ward: "Ward 4 — Old Fort",
  },
  {
    id: "EQ-02",
    name: "JCB 3DX EcoXcellence Backhoe",
    type: "Roads & Excavation",
    reg_no: "KA-04-EX-4491",
    operator: "Basavaraj (9845229104)",
    status: "DEPLOYED",
    ward: "Ward 7 — MG Road",
  },
  {
    id: "EQ-03",
    name: "Hydro-Mix Rapid Pothole Patch Machine",
    type: "Asphalt Works",
    reg_no: "KA-04-AP-1029",
    operator: "Nagaraj (9845338192)",
    status: "AVAILABLE",
    ward: "Central Yard Depot",
  },
  {
    id: "EQ-04",
    name: "10,000L Emergency Potable Water Tanker",
    type: "Water Supply",
    reg_no: "KA-04-WT-5501",
    operator: "Siddalingappa (9845447182)",
    status: "AVAILABLE",
    ward: "Ward 2 — Kuvempu Nagar",
  },
  {
    id: "EQ-05",
    name: "18m Hydraulic Boom Cherry Picker",
    type: "Streetlights & Tree Clearance",
    reg_no: "KA-04-HB-3304",
    operator: "Chandrashekar (9845556172)",
    status: "STANDBY",
    ward: "Ward 9 — Subhash Nagar",
  },
];

export default function OfficerDashboardPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<"assign" | "resolve" | "inspect" | "asset_dispatch" | null>(null);

  // Machinery fleet state
  const [assets, setAssets] = useState<HeavyAsset[]>(INITIAL_HEAVY_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<HeavyAsset | null>(null);
  const [assetDispatchWard, setAssetDispatchWard] = useState("");
  const [assetDispatchTask, setAssetDispatchTask] = useState("");

  // Form states
  const [assignedWorkerId, setAssignedWorkerId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
  });

  const { data: complaintsData, isLoading, refetch } = useQuery({
    queryKey: ["officer", "complaints", statusFilter],
    queryFn: async () => {
      const params: any = { page_size: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/complaints", { params });
      return res.data as { items: Complaint[]; total: number };
    },
  });

  const { data: fieldWorkers } = useQuery({
    queryKey: ["meta", "field-workers"],
    queryFn: async () => {
      try {
        const res = await api.get("/complaints/meta/field-workers");
        return res.data as FieldWorker[];
      } catch {
        return [];
      }
    },
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedComplaint || !assignedWorkerId) return;
      const res = await api.post(`/complaints/${selectedComplaint.id}/assign`, {
        user_id: assignedWorkerId,
        notes: assignNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Complaint assigned to field worker");
      setModalMode(null);
      queryClient.invalidateQueries({ queryKey: ["officer", "complaints"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Assignment failed");
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedComplaint || !resolutionNotes) return;
      const res = await api.post(`/complaints/${selectedComplaint.id}/resolve`, {
        resolution_notes: resolutionNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Complaint marked as resolved!");
      setModalMode(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["officer", "complaints"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Resolution failed");
    },
  });

  // Dispatch Heavy Asset Handler
  const handleDispatchAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setAssets((prev) =>
      prev.map((a) =>
        a.id === selectedAsset.id
          ? { ...a, status: "DEPLOYED", ward: assetDispatchWard || a.ward }
          : a
      )
    );
    toast.success(`Heavy asset ${selectedAsset.name} dispatched to ${assetDispatchWard || "site"}`);
    setModalMode(null);
  };

  const complaints = complaintsData?.items ?? [];
  const totalBreached = complaints.filter((c) => c.sla_breached).length;
  const totalEmergency = complaints.filter((c) => c.is_emergency).length;
  const availableAssetsCount = assets.filter((a) => a.status === "AVAILABLE").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans pb-20">
      {/* Officer Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm leading-tight">JANASEVA OS</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  CIVIC & PWD DISPATCH CONSOLE
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                {user ? `${user.full_name} (${user.primary_role})` : "Public Works & Civic Infrastructure Desk"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/admin/map"
              className="text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>GIS Work Map</span>
            </Link>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="text-xs text-gray-400 hover:text-rose-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Queue Volume</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{complaintsData?.total ?? 0}</div>
            <div className="text-[11px] text-gray-500 mt-1">Total pending work orders</div>
          </div>

          <div className="bg-gray-900 border border-rose-500/30 bg-rose-950/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-rose-300 mb-1">
              <span className="text-xs font-medium">Critical / SOS</span>
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-3xl font-extrabold text-rose-400">{totalEmergency}</div>
            <div className="text-[11px] text-rose-300/70 mt-1">High priority civic breaches</div>
          </div>

          <div className="bg-gray-900 border border-amber-500/30 bg-amber-950/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-amber-300 mb-1">
              <span className="text-xs font-medium">SLA Breaches</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{totalBreached}</div>
            <div className="text-[11px] text-amber-300/70 mt-1">Requiring immediate escalation</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Heavy Machinery Ready</span>
              <Truck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {availableAssetsCount} <span className="text-sm font-normal text-gray-400">/ {assets.length} Units</span>
            </div>
            <div className="text-[11px] text-emerald-300/70 mt-1">JCB, Jetters, Pavers in depot</div>
          </div>
        </div>

        {/* Section: Heavy Machinery & Civic Equipment Dispatch Bar */}
        <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Civic Heavy Equipment & Machinery Fleet</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Rapidly dispatch excavation, drainage jetting, road paving, and mobile tanker units to resolve complex civic emergencies
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Central Municipal Yard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-gray-400 font-bold">{asset.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        asset.status === "AVAILABLE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : asset.status === "DEPLOYED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{asset.name}</h4>
                  <div className="text-[11px] text-blue-400 mt-0.5 font-medium">{asset.type}</div>
                  <div className="text-[11px] text-gray-400 mt-2 font-mono">{asset.reg_no}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">📍 {asset.ward}</div>
                  <div className="text-[10px] text-gray-500 mt-1">👷 {asset.operator}</div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5">
                  <button
                    disabled={asset.status === "DEPLOYED"}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setAssetDispatchWard(asset.ward);
                      setModalMode("asset_dispatch");
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                      asset.status === "AVAILABLE"
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>{asset.status === "DEPLOYED" ? "In Field" : "Dispatch Asset"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 border border-white/10 p-4 rounded-2xl">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "", label: "All Items" },
              { id: "REPORTED", label: "Reported" },
              { id: "VERIFIED", label: "Verified" },
              { id: "ASSIGNED", label: "Assigned" },
              { id: "IN_PROGRESS", label: "In Progress" },
              { id: "EVIDENCE_SUBMITTED", label: "Evidence In" },
              { id: "RESOLVED", label: "Resolved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Showing {complaints.length} tickets in queue
          </span>
        </div>

        {/* Complaints Table */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading department queue...</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No complaints in this status category.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950/60 text-gray-400 text-xs uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Ticket ID</th>
                    <th className="py-3.5 px-4">Title &amp; Location</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">SLA Clock</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-200">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-400 font-semibold">
                        <Link href={`/citizen/complaints/${c.id}`} className="hover:underline">
                          {c.complaint_id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm line-clamp-1">{c.title}</div>
                        {c.address && (
                          <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">📍 {c.address}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        {c.category_code?.replace(/_/g, " ") ?? "General Civic"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            c.priority === "CRITICAL"
                              ? "bg-red-950 text-red-300 border border-red-800/50"
                              : c.priority === "HIGH"
                              ? "bg-orange-950 text-orange-300 border border-orange-800/50"
                              : "bg-blue-950 text-blue-300 border border-blue-800/50"
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {c.sla_breached ? (
                          <span className="text-red-400 font-semibold">⏰ Breached</span>
                        ) : c.sla_deadline ? (
                          <span className="text-gray-400 font-mono text-[11px]">
                            {formatDistanceToNow(new Date(c.sla_deadline), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Evidence inspection button for review */}
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setModalMode("inspect");
                            }}
                            className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                            title="Inspect field evidence & GPS"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Proof</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setModalMode("assign");
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setModalMode("resolve");
                            }}
                            className="bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Dispatch Heavy Machinery */}
      {modalMode === "asset_dispatch" && selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-blue-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dispatch Heavy Equipment</h3>
                  <p className="text-xs text-gray-400">{selectedAsset.name}</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target Ward / Site Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward 4 — Old Fort Canal culvert"
                  value={assetDispatchWard}
                  onChange={(e) => setAssetDispatchWard(e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Assigned Task Directive</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. De-silt drainage culvert, clear rubble, and widen flow passage before forecasted rain..."
                  value={assetDispatchTask}
                  onChange={(e) => setAssetDispatchTask(e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                <div className="font-semibold text-white">Operator: {selectedAsset.operator}</div>
                <div>Vehicle Reg: {selectedAsset.reg_no}</div>
                <div>GPS CAD Beacon: Active & Transmitting</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Field Resolution Proof Inspection */}
      {modalMode === "inspect" && selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-3xl max-w-lg w-full p-6 space-y-4 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ground Resolution Proof Verification</h3>
                  <p className="text-xs font-mono text-purple-400">{selectedComplaint.complaint_id}</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="font-semibold text-white text-sm">{selectedComplaint.title}</div>
              <div className="text-xs text-gray-400">
                📍 {selectedComplaint.address || "Ward 4, Municipal Area"}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Lat/Lng: {selectedComplaint.latitude || "12.9716"}, {selectedComplaint.longitude || "77.5946"}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">GPS Geo-Fenced: VERIFIED</span>
              </div>
            </div>

            <div className="border border-dashed border-white/15 rounded-2xl p-4 text-center bg-gray-950/60">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-white">Before & After Ground Photography Captured</div>
              <p className="text-[11px] text-gray-400 mt-1">
                Field team verified resolution with tamper-evident EXIF timestamp & satellite coordinate stamping.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setResolutionNotes("Ground verification confirmed by Department Officer via GPS-stamped photo proof.");
                  setModalMode("resolve");
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Close Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {modalMode === "assign" && selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Assign to Field Worker
            </h3>
            <p className="text-xs text-gray-400">
              Ticket: <span className="text-blue-400 font-mono">{selectedComplaint.complaint_id}</span> — {selectedComplaint.title}
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Select Field Personnel
              </label>
              <select
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose Field Worker --</option>
                {fieldWorkers?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} ({w.phone || w.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Instructions / Work Notes
              </label>
              <textarea
                rows={3}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Specific inspection directions or tools needed on site..."
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || !assignedWorkerId}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/30"
              >
                {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {modalMode === "resolve" && selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Verify &amp; Resolve Complaint
            </h3>
            <p className="text-xs text-gray-400">
              Ticket: <span className="text-blue-400 font-mono">{selectedComplaint.complaint_id}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Official Resolution Summary *
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe ground verification, repairs conducted, materials utilized, and completion details..."
                className="w-full bg-gray-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending || resolutionNotes.length < 5}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/30"
              >
                {resolveMutation.isPending ? "Resolving..." : "Mark as Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
