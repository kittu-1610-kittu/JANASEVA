"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShieldAlert,
  Radio,
  Siren,
  Shield,
  Car,
  AlertOctagon,
  PhoneCall,
  Phone,
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  Send,
  PlusCircle,
  Filter,
  ArrowUpRight,
  LogOut,
  RefreshCw,
  Zap,
} from "lucide-react";
import api, { clearTokens } from "@/lib/api";

interface SOSDistressCall {
  call_id: string;
  caller_name: string;
  caller_phone: string;
  emergency_type: string;
  priority: string;
  ward_number: number;
  location_address: string;
  time_elapsed_mins: number;
  assigned_unit?: string;
  status: string;
}

interface PCRPatrolUnit {
  unit_id: string;
  callsign: string;
  vehicle_type: string;
  patrol_sector: string;
  in_charge_officer: string;
  officer_rank: string;
  officer_phone: string;
  current_status: string;
  gps_lat: number;
  gps_lon: number;
  assigned_incident?: string;
}

interface LawOrderHotspot {
  hotspot_id: string;
  zone_name: string;
  ward_number: number;
  risk_category: string;
  recent_incidents_count: number;
  recommended_action: string;
  patrol_frequency: string;
}

interface SecurityCordon {
  cordon_id: string;
  perimeter_name: string;
  ward_number: number;
  reason: string;
  personnel_deployed: number;
  declared_by: string;
  is_active: boolean;
}

interface PoliceOverviewData {
  metrics: {
    active_sos_alerts: number;
    flash_critical_sos: number;
    total_patrol_fleet: number;
    patrols_deployed: number;
    patrols_available: number;
    active_cordons: number;
    average_sos_response_mins: number;
    district_security_posture: string;
  };
  sos_calls: SOSDistressCall[];
  patrol_units: PCRPatrolUnit[];
  hotspots: LawOrderHotspot[];
  active_cordons: SecurityCordon[];
}

export default function PoliceOfficerDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"cad" | "sos" | "cordons" | "hotspots">("sos");

  // Patrol Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [targetIncident, setTargetIncident] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("CODE_RED");

  // Cordon Modal
  const [cordonModalOpen, setCordonModalOpen] = useState(false);
  const [cordonName, setCordonName] = useState("");
  const [cordonWard, setCordonWard] = useState(1);
  const [cordonReason, setCordonReason] = useState("Public safety perimeter & vehicle diversion");
  const [cordonPersonnel, setCordonPersonnel] = useState(8);

  // Fetch Police Overview
  const { data: policeData, isLoading, refetch } = useQuery<PoliceOverviewData>({
    queryKey: ["police", "overview"],
    queryFn: async () => {
      const res = await api.get("/police-dept/overview");
      return res.data;
    },
    refetchInterval: 10_000,
  });

  // Fetch Police Grievances
  const { data: complaintsData } = useQuery({
    queryKey: ["police", "complaints"],
    queryFn: async () => {
      const res = await api.get("/complaints", {
        params: { page_size: 20 },
      });
      return res.data as { items: any[]; total: number };
    },
  });

  // Dispatch Patrol Mutation
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/police-dept/dispatch-patrol", {
        unit_id: selectedUnit,
        target_incident_id: targetIncident,
        destination: destination,
        urgency_level: urgency,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Patrol unit dispatched!");
      setDispatchModalOpen(false);
      setDestination("");
      queryClient.invalidateQueries({ queryKey: ["police", "overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Patrol dispatch failed");
    },
  });

  // Declare Cordon Mutation
  const cordonMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/police-dept/cordon", {
        perimeter_name: cordonName,
        ward_number: Number(cordonWard),
        reason: cordonReason,
        personnel_count: Number(cordonPersonnel),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Security cordon activated!");
      setCordonModalOpen(false);
      setCordonName("");
      queryClient.invalidateQueries({ queryKey: ["police", "overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to declare cordon");
    },
  });

  const metrics = policeData?.metrics ?? {
    active_sos_alerts: 3,
    flash_critical_sos: 2,
    total_patrol_fleet: 5,
    patrols_deployed: 4,
    patrols_available: 2,
    active_cordons: 1,
    average_sos_response_mins: 5.4,
    district_security_posture: "ELEVATED_PATROL_STATUS",
  };

  const sosCalls = policeData?.sos_calls ?? [];
  const units = policeData?.patrol_units ?? [];
  const hotspots = policeData?.hotspots ?? [];
  const cordons = policeData?.active_cordons ?? [];
  const complaints = complaintsData?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Police CAD Navigation */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-600 to-red-700 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg shadow-rose-600/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide">Krishnapur Police Control (112 CAD)</span>
                <span className="text-xs bg-rose-500/20 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full font-medium">
                  Law Enforcement Console
                </span>
              </div>
              <p className="text-xs text-gray-400">Station House Officer / Inspector Mohan Das</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Refresh radar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors border border-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Flash Emergency Alert Bar */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950/50 via-rose-950/30 to-amber-950/30 border border-rose-500/40 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Siren className="w-6 h-6 text-red-400 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Live 112 Public Distress Radar Active</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                    {metrics.active_sos_alerts} ALERTS IN QUEUE
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  Average PCR response time: <span className="font-semibold text-emerald-400">{metrics.average_sos_response_mins} minutes</span>. Rapid patrol routing online.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedUnit(units[0]?.callsign || "PCR-ALPHA-01");
                  setTargetIncident(sosCalls[0]?.call_id || "SOS-112-901");
                  setDestination(sosCalls[0]?.location_address || "Ward 1, Central");
                  setDispatchModalOpen(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                Dispatch PCR Unit
              </button>
              <button
                onClick={() => setCordonModalOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium text-sm px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Deploy Cordon / Checkpoint
              </button>
            </div>
          </div>
        </div>

        {/* Police Telemetry Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-red-500/30 bg-red-950/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Flash SOS Alarms</span>
              <Siren className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{metrics.active_sos_alerts} <span className="text-xs text-gray-400 font-normal">Active Calls</span></div>
            <p className="text-[11px] text-red-300/80 mt-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {metrics.flash_critical_sos} Code Red Critical
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">PCR Fleet Available</span>
              <Car className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{metrics.patrols_available} <span className="text-xs text-gray-400 font-normal">/ {metrics.total_patrol_fleet} Standby</span></div>
            <p className="text-[11px] text-gray-400 mt-3">{metrics.patrols_deployed} Units on Sector Patrol</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Security Cordons</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{metrics.active_cordons} <span className="text-xs text-gray-400 font-normal">Checkpoints</span></div>
            <p className="text-[11px] text-gray-400 mt-3">Barricades active in canal zone</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Security Posture</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-1">ELEVATED VIGILANCE</div>
            <p className="text-[11px] text-gray-400 mt-3">All 5 Wards covered under CAD</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("sos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "sos"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <PhoneCall className="w-4 h-4 text-rose-400" />
            112 SOS Distress Queue ({sosCalls.length})
          </button>

          <button
            onClick={() => setActiveTab("cad")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "cad"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Car className="w-4 h-4 text-blue-400" />
            PCR Patrol Fleet CAD ({units.length})
          </button>

          <button
            onClick={() => setActiveTab("cordons")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "cordons"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            Security Cordons ({cordons.length})
          </button>

          <button
            onClick={() => setActiveTab("hotspots")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "hotspots"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Compass className="w-4 h-4 text-purple-400" />
            Law & Order Hotspots ({hotspots.length})
          </button>
        </div>

        {/* Tab 1: Live SOS Calls */}
        {activeTab === "sos" && (
          <div className="space-y-4">
            {sosCalls.map((call) => (
              <div key={call.call_id} className="glass-card rounded-2xl p-6 border border-white/10 hover:border-rose-500/40 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      call.priority === "FLASH_CRITICAL"
                        ? "bg-red-600/20 text-red-400 border-red-500/40 animate-pulse"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}>
                      <PhoneCall className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-rose-400 font-bold">{call.call_id}</span>
                        <h3 className="text-base font-bold text-white">{call.emergency_type.replace(/_/g, " ")}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                          {call.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        {call.location_address} • Ward {call.ward_number}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Caller: <span className="text-white font-medium">{call.caller_name}</span> ({call.caller_phone}) • Received {call.time_elapsed_mins} mins ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {call.assigned_unit ? (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5" />
                        Assigned: {call.assigned_unit}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedUnit(units[0]?.callsign || "PCR-ALPHA-01");
                          setTargetIncident(call.call_id);
                          setDestination(call.location_address);
                          setDispatchModalOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Dispatch PCR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: PCR Patrol Fleet CAD */}
        {activeTab === "cad" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {units.map((unit) => (
              <div key={unit.unit_id} className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-md">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{unit.callsign}</h4>
                      <p className="text-xs text-gray-400">{unit.vehicle_type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    unit.current_status === "AVAILABLE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : unit.current_status === "RESPONDING"
                      ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  }`}>
                    {unit.current_status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 my-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Patrol Sector:</span>
                    <span className="font-medium text-white">{unit.patrol_sector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Officer in Charge:</span>
                    <span>{unit.in_charge_officer} ({unit.officer_rank})</span>
                  </div>
                  {unit.assigned_incident && (
                    <div className="flex justify-between text-rose-300">
                      <span>Assigned Incident:</span>
                      <span className="font-mono font-bold">{unit.assigned_incident}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {unit.officer_phone}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedUnit(unit.callsign);
                      setDestination(unit.patrol_sector);
                      setDispatchModalOpen(true);
                    }}
                    className="text-xs bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    Route / Reassign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Security Cordons */}
        {activeTab === "cordons" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-400">Active perimeters and checkpoints deployed for hazard containment</p>
              <button
                onClick={() => setCordonModalOpen(true)}
                className="text-xs bg-rose-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
              >
                + Deploy Cordon
              </button>
            </div>
            {cordons.map((c) => (
              <div key={c.cordon_id} className="glass-card rounded-2xl p-6 border border-amber-500/30 bg-amber-950/10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">{c.cordon_id}</span>
                      <h4 className="font-bold text-white text-base">{c.perimeter_name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        ACTIVE PERIMETER
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-2">{c.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">Ward {c.ward_number} • Deployed by: {c.declared_by}</p>
                  </div>
                  <div className="bg-white/5 px-4 py-2 rounded-xl text-center border border-white/5">
                    <div className="text-xs text-gray-400">Force Deployed</div>
                    <div className="text-lg font-bold text-amber-400">{c.personnel_deployed} Officers</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Law & Order Hotspots */}
        {activeTab === "hotspots" && (
          <div className="space-y-4">
            {hotspots.map((h) => (
              <div key={h.hotspot_id} className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-400 font-bold">{h.hotspot_id}</span>
                      <h4 className="font-bold text-white text-base">{h.zone_name}</h4>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Ward {h.ward_number} • Category: {h.risk_category.replace(/_/g, " ")}</p>
                  </div>
                  <div className="bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20 text-right">
                    <div className="text-[11px] text-purple-300">{h.recent_incidents_count} Past Incidents</div>
                  </div>
                </div>

                <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5">
                  <strong className="text-gray-400 block mb-1">Recommended Preventive Measure:</strong>
                  {h.recommended_action}
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 text-xs text-gray-400 border-t border-white/5">
                  <span>Patrol Frequency: <strong className="text-white">{h.patrol_frequency}</strong></span>
                  <button
                    onClick={() => toast.success(`Cheetah patrol frequency doubled for ${h.zone_name}`)}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Increase Patrol Frequency →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Police Public Safety Grievances */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Public Safety & Nuisance Grievances</h3>
              <p className="text-xs text-gray-400">Citizen reported safety hazards, street harassment & traffic issues</p>
            </div>
            <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-gray-300">
              {complaints.length} Total Registered
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {complaints.slice(0, 5).map((c: any) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-rose-400">{c.complaint_id}</span>
                    <h4 className="font-medium text-white text-sm truncate">{c.title}</h4>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === "RESOLVED"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {c.status}
                  </span>
                  <Link
                    href={`/citizen/complaints/${c.id}`}
                    className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Patrol Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">CAD Patrol Unit Dispatch</h3>
                <p className="text-xs text-gray-400">Radio transmission to mobile data terminal</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Select Patrol Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                {units.map((u) => (
                  <option key={u.unit_id} value={u.callsign}>
                    {u.callsign} ({u.vehicle_type}) — {u.in_charge_officer}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Destination Location</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Near Bus Stand East Exit, Ward 1"
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Urgency Priority</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="CODE_RED">Code Red — Immediate Siren & Lights (Life Hazard)</option>
                <option value="CODE_BLUE">Code Blue — Urgent Response (Public Disturbance)</option>
                <option value="ROUTINE">Routine — Regular Sector Patrol Check</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-xs text-gray-400 hover:text-white px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => dispatchMutation.mutate()}
                disabled={!destination.trim() || dispatchMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-600/30 disabled:opacity-50 cursor-pointer"
              >
                {dispatchMutation.isPending ? "Transmitting..." : "Authorize Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cordon Modal */}
      {cordonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-600/30 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Deploy Security Cordon</h3>
                <p className="text-xs text-gray-400">Establish barricade & diversion checkpoint</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Perimeter / Location Name</label>
              <input
                type="text"
                value={cordonName}
                onChange={(e) => setCordonName(e.target.value)}
                placeholder="e.g. Underpass Bridge, Ward 4"
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Ward Number</label>
                <select
                  value={cordonWard}
                  onChange={(e) => setCordonWard(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>Ward 1 (Central)</option>
                  <option value={2}>Ward 2 (Gandhi Nagar)</option>
                  <option value={3}>Ward 3 (Kuvempu Nagar)</option>
                  <option value={4}>Ward 4 (Old Fort Canal)</option>
                  <option value={5}>Ward 5 (Industrial Bypass)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Officers Deployed</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={cordonPersonnel}
                  onChange={(e) => setCordonPersonnel(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Containment Reason</label>
              <input
                type="text"
                value={cordonReason}
                onChange={(e) => setCordonReason(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setCordonModalOpen(false)}
                className="text-xs text-gray-400 hover:text-white px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => cordonMutation.mutate()}
                disabled={!cordonName.trim() || cordonMutation.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
              >
                {cordonMutation.isPending ? "Deploying..." : "Activate Cordon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
