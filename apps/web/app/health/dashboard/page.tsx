"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  Ambulance,
  Building2,
  FileCheck2,
  ShieldAlert,
  Send,
  PlusCircle,
  Clock,
  MapPin,
  Phone,
  Bed,
  HeartPulse,
  Filter,
  CheckCircle2,
  ArrowUpRight,
  LogOut,
  RefreshCw,
} from "lucide-react";
import api, { clearTokens } from "@/lib/api";

interface HospitalBedStat {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  ward_number: number;
  general_total: number;
  general_available: number;
  icu_total: number;
  icu_available: number;
  ventilator_total: number;
  ventilator_available: number;
  oxygen_total: number;
  oxygen_available: number;
  blood_bank_status: string;
  contact_phone: string;
}

interface DiseaseCluster {
  id: string;
  disease_name: string;
  affected_ward: number;
  ward_name: string;
  severity: string;
  confirmed_cases: number;
  suspected_cases: number;
  containment_status: string;
  identified_source: string;
  first_reported: string;
}

interface AmbulanceUnit {
  unit_id: string;
  vehicle_number: string;
  base_station: string;
  current_sector: string;
  type: string;
  status: string;
  driver_name: string;
  paramedic_name: string;
  contact_phone: string;
  eta_mins?: number;
}

interface SanitaryNotice {
  notice_id: string;
  target_establishment: string;
  ward_number: number;
  violation_type: string;
  issued_date: string;
  compliance_deadline: string;
  status: string;
}

interface HealthOverviewData {
  metrics: {
    total_beds: number;
    available_beds: number;
    bed_occupancy_pct: number;
    total_icu: number;
    available_icu: number;
    icu_occupancy_pct: number;
    total_ambulances: number;
    available_ambulances: number;
    active_disease_clusters: number;
    active_sanitary_notices: number;
    district_epidemic_level: string;
  };
  hospitals: HospitalBedStat[];
  disease_clusters: DiseaseCluster[];
  ambulance_fleet: AmbulanceUnit[];
  sanitary_notices: SanitaryNotice[];
}

export default function HealthOfficerDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"beds" | "outbreaks" | "ambulances" | "notices">("beds");

  // Ambulance Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState<string>("");
  const [dispatchAddress, setDispatchAddress] = useState("");
  const [patientCondition, setPatientCondition] = useState("Severe Respiratory Distress / Critical");

  // Notice Creation Modal
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeTarget, setNoticeTarget] = useState("");
  const [noticeWard, setNoticeWard] = useState(1);
  const [noticeViolation, setNoticeViolation] = useState("Stagnant Water Mosquito Breeding Grounds / Uncovered Tanks");
  const [noticeDays, setNoticeDays] = useState(3);

  // Fetch Health Overview
  const { data: healthData, isLoading, refetch } = useQuery<HealthOverviewData>({
    queryKey: ["health", "overview"],
    queryFn: async () => {
      const res = await api.get("/health-dept/overview");
      return res.data;
    },
    refetchInterval: 15_000,
  });

  // Fetch Health Complaints
  const { data: complaintsData } = useQuery({
    queryKey: ["health", "complaints"],
    queryFn: async () => {
      const res = await api.get("/complaints", {
        params: { page_size: 20 },
      });
      return res.data as { items: any[]; total: number };
    },
  });

  // Dispatch Ambulance Mutation
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/health-dept/dispatch-ambulance", {
        unit_id: selectedAmbulance,
        emergency_title: "Emergency Medical Response",
        destination_address: dispatchAddress,
        priority: "CRITICAL",
        patient_condition: patientCondition,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "108 Ambulance dispatched!");
      setDispatchModalOpen(false);
      setDispatchAddress("");
      queryClient.invalidateQueries({ queryKey: ["health", "overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Ambulance dispatch failed");
    },
  });

  // Issue Notice Mutation
  const noticeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/health-dept/notices", {
        target_establishment: noticeTarget,
        ward_number: Number(noticeWard),
        violation_type: noticeViolation,
        compliance_days: Number(noticeDays),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Sanitary notice served successfully");
      setNoticeModalOpen(false);
      setNoticeTarget("");
      queryClient.invalidateQueries({ queryKey: ["health", "overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to serve sanitary notice");
    },
  });

  const metrics = healthData?.metrics ?? {
    total_beds: 790,
    available_beds: 152,
    bed_occupancy_pct: 80.7,
    total_icu: 88,
    available_icu: 20,
    icu_occupancy_pct: 77.2,
    total_ambulances: 8,
    available_ambulances: 6,
    active_disease_clusters: 2,
    active_sanitary_notices: 6,
    district_epidemic_level: "LEVEL_1_ELEVATED_VIGILANCE",
  };

  const hospitals = healthData?.hospitals ?? [];
  const clusters = healthData?.disease_clusters ?? [];
  const ambulances = healthData?.ambulance_fleet ?? [];
  const notices = healthData?.sanitary_notices ?? [];
  const complaints = complaintsData?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* CMHO Top Navigation */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide">Krishnapur Health Directorate</span>
                <span className="text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                  CMHO Console
                </span>
              </div>
              <p className="text-xs text-gray-400">Chief Medical & Health Officer — Dr. Ananya Iyer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Refresh telemetry"
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
        {/* Epidemic Surveillance Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-950/40 via-teal-950/20 to-blue-950/40 border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">District Epidemiological Surveillance Active</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {metrics.district_epidemic_level}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  Active vector containment operations deployed across Ward 3 (Kuvempu Nagar) and canal water monitoring in Ward 4.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedAmbulance(ambulances[0]?.unit_id || "AMB-108-01");
                  setDispatchModalOpen(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Ambulance className="w-4 h-4" />
                Dispatch 108 Ambulance
              </button>
              <button
                onClick={() => setNoticeModalOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium text-sm px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                Issue Sanitary Notice
              </button>
            </div>
          </div>
        </div>

        {/* Health Telemetry Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Total Hospital Beds</span>
              <Bed className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{metrics.available_beds} <span className="text-xs text-gray-500 font-normal">/ {metrics.total_beds} Avail</span></div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${100 - metrics.bed_occupancy_pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">{metrics.bed_occupancy_pct}% Occupancy rate</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Critical Care & ICUs</span>
              <HeartPulse className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white">{metrics.available_icu} <span className="text-xs text-gray-500 font-normal">/ {metrics.total_icu} Avail</span></div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full transition-all"
                style={{ width: `${100 - metrics.icu_occupancy_pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">{metrics.icu_occupancy_pct}% ICU Occupied</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">108 Emergency Fleet</span>
              <Ambulance className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{metrics.available_ambulances} <span className="text-xs text-gray-400 font-normal">Units Ready</span></div>
            <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {metrics.total_ambulances} total stationed units
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-400">Outbreak Clusters</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{metrics.active_disease_clusters} <span className="text-xs text-gray-400 font-normal">Active Wards</span></div>
            <p className="text-[11px] text-gray-400 mt-3">
              {metrics.active_sanitary_notices} open sanitary notices
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("beds")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "beds"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Building2 className="w-4 h-4" />
            District Hospital & ICU Matrix ({hospitals.length})
          </button>

          <button
            onClick={() => setActiveTab("outbreaks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "outbreaks"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Disease Outbreak Surveillance ({clusters.length})
          </button>

          <button
            onClick={() => setActiveTab("ambulances")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "ambulances"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Ambulance className="w-4 h-4" />
            Ambulance 108 Fleet ({ambulances.length})
          </button>

          <button
            onClick={() => setActiveTab("notices")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "notices"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Sanitary Inspection Notices ({notices.length})
          </button>
        </div>

        {/* Tab 1: Hospital & Bed Matrix */}
        {activeTab === "beds" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitals.map((h) => (
                <div key={h.facility_id} className="glass-card rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{h.facility_name}</h3>
                      <p className="text-xs text-gray-400">{h.facility_type} • Ward {h.ward_number}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      h.blood_bank_status === "ADEQUATE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      Blood Bank: {h.blood_bank_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 my-4 text-center">
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <div className="text-xs text-gray-400 mb-1">General</div>
                      <div className="text-lg font-bold text-white">{h.general_available} <span className="text-xs text-gray-500 font-normal">/ {h.general_total}</span></div>
                    </div>
                    <div className="bg-rose-500/10 rounded-xl p-2.5 border border-rose-500/20">
                      <div className="text-xs text-rose-300 mb-1 font-medium">ICU Beds</div>
                      <div className="text-lg font-bold text-rose-400">{h.icu_available} <span className="text-xs text-rose-300/60 font-normal">/ {h.icu_total}</span></div>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-2.5 border border-purple-500/20">
                      <div className="text-xs text-purple-300 mb-1 font-medium">Ventilator</div>
                      <div className="text-lg font-bold text-purple-400">{h.ventilator_available} <span className="text-xs text-purple-300/60 font-normal">/ {h.ventilator_total}</span></div>
                    </div>
                    <div className="bg-cyan-500/10 rounded-xl p-2.5 border border-cyan-500/20">
                      <div className="text-xs text-cyan-300 mb-1 font-medium">Oxygen</div>
                      <div className="text-lg font-bold text-cyan-400">{h.oxygen_available} <span className="text-xs text-cyan-300/60 font-normal">/ {h.oxygen_total}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-3">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-cyan-400" />
                      {h.contact_phone}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAmbulance(ambulances[0]?.unit_id || "AMB-108-01");
                        setDispatchAddress(`${h.facility_name}, Ward ${h.ward_number}`);
                        setDispatchModalOpen(true);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                    >
                      Route Patient Here <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Disease Outbreak Surveillance */}
        {activeTab === "outbreaks" && (
          <div className="space-y-4">
            {clusters.map((c) => (
              <div key={c.id} className="glass-card rounded-2xl p-6 border border-amber-500/30 bg-amber-950/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{c.disease_name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Ward {c.affected_ward} ({c.ward_name}) • Reported: {c.first_reported}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <div>
                      <div className="text-[11px] text-gray-400">Confirmed</div>
                      <div className="text-lg font-bold text-red-400">{c.confirmed_cases}</div>
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <div>
                      <div className="text-[11px] text-gray-400">Suspected</div>
                      <div className="text-lg font-bold text-amber-400">{c.suspected_cases}</div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-300 bg-black/30 p-3 rounded-xl border border-white/5 mb-4">
                  <strong className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Identified Vector / Source:</strong>
                  {c.identified_source}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    Status: {c.containment_status.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() => {
                      toast.success(`Vector containment team re-notified for Ward ${c.affected_ward}`);
                    }}
                    className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors"
                  >
                    Escalate Vector Team
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Ambulance 108 Fleet */}
        {activeTab === "ambulances" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ambulances.map((a) => (
              <div key={a.unit_id} className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-bold text-white shadow-md">
                      <Ambulance className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{a.unit_id} • {a.vehicle_number}</h4>
                      <p className="text-xs text-gray-400">{a.type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    a.status === "AVAILABLE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : a.status === "DISPATCHED" || a.status === "EN_ROUTE"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  }`}>
                    {a.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5 my-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Location:</span>
                    <span className="font-medium text-white">{a.current_sector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Base Station:</span>
                    <span>{a.base_station}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Crew:</span>
                    <span>{a.driver_name} (Driver) • {a.paramedic_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {a.contact_phone}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAmbulance(a.unit_id);
                      setDispatchModalOpen(true);
                    }}
                    disabled={a.status !== "AVAILABLE"}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      a.status === "AVAILABLE"
                        ? "bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {a.status === "AVAILABLE" ? "Dispatch Unit" : "Engaged"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Sanitary Notices */}
        {activeTab === "notices" && (
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-semibold text-white text-sm">Active Sanitary & Food Safety Inspection Notices</h3>
              <button
                onClick={() => setNoticeModalOpen(true)}
                className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg font-medium"
              >
                + Issue Notice
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {notices.map((n) => (
                <div key={n.notice_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400">{n.notice_id}</span>
                      <span className="font-semibold text-white text-sm">{n.target_establishment}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{n.violation_type} • Ward {n.ward_number}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-gray-400">Deadline: {n.compliance_deadline}</div>
                      <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        n.status === "PENDING_INSPECTION"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {n.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Grievances Queue */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Public Health & Medical Grievances</h3>
              <p className="text-xs text-gray-400">Citizen complaints routed directly to the Health Directorate</p>
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
                    <span className="font-mono text-xs text-cyan-400">{c.complaint_id}</span>
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

      {/* Ambulance Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30 flex items-center justify-center">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Emergency 108 Dispatch</h3>
                <p className="text-xs text-gray-400">Direct transmission to vehicle terminal</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Select Ready Ambulance</label>
              <select
                value={selectedAmbulance}
                onChange={(e) => setSelectedAmbulance(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              >
                {ambulances.map((a) => (
                  <option key={a.unit_id} value={a.unit_id}>
                    {a.unit_id} ({a.type.replace(/_/g, " ")}) — {a.base_station}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Patient Location / Address</label>
              <input
                type="text"
                value={dispatchAddress}
                onChange={(e) => setDispatchAddress(e.target.value)}
                placeholder="e.g. 4th Cross, Kuvempu Nagar, Near Water Tank"
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Triage Condition / Symptoms</label>
              <input
                type="text"
                value={patientCondition}
                onChange={(e) => setPatientCondition(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              />
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
                disabled={!dispatchAddress.trim() || dispatchMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-600/30 disabled:opacity-50 cursor-pointer"
              >
                {dispatchMutation.isPending ? "Transmitting..." : "Confirm 108 Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sanitary Notice Modal */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Issue Sanitary Order / Notice</h3>
                <p className="text-xs text-gray-400">Section 44 Public Health Act Compliance</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Establishment / Property Name</label>
              <input
                type="text"
                value={noticeTarget}
                onChange={(e) => setNoticeTarget(e.target.value)}
                placeholder="e.g. Star Bakery & Sweets / Residential Complex #14"
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Ward Number</label>
                <select
                  value={noticeWard}
                  onChange={(e) => setNoticeWard(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>Ward 1 (Central)</option>
                  <option value={2}>Ward 2 (Gandhi Nagar)</option>
                  <option value={3}>Ward 3 (Kuvempu Nagar)</option>
                  <option value={4}>Ward 4 (Old Fort Canal)</option>
                  <option value={5}>Ward 5 (Industrial Bypass)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Compliance Days</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Violation Category</label>
              <input
                type="text"
                value={noticeViolation}
                onChange={(e) => setNoticeViolation(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setNoticeModalOpen(false)}
                className="text-xs text-gray-400 hover:text-white px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => noticeMutation.mutate()}
                disabled={!noticeTarget.trim() || noticeMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-cyan-600/30 disabled:opacity-50 cursor-pointer"
              >
                {noticeMutation.isPending ? "Issuing..." : "Serve Notice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
