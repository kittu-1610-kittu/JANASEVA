"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShieldAlert,
  Send,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Radio,
  Star,
  RefreshCw,
  Plus,
  X,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import api from "@/lib/api";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#6366f1"];

interface DepartmentLeagueEntry {
  dept_id: string;
  department_name: string;
  department_code: string;
  head_officer_name: string;
  open_tickets: number;
  resolved_today: number;
  sla_compliance_pct: number;
  avg_resolution_hours: number;
  citizen_rating: number;
  critical_breaches: number;
  status_trend: string;
}

interface ExecutiveDirective {
  directive_id: string;
  title: string;
  target_department: string;
  issued_to_name: string;
  priority: string;
  issued_date: string;
  compliance_deadline: string;
  status: string;
  instructions: string;
}

interface AdminOverviewData {
  metrics: {
    district_name: string;
    total_open_grievances: number;
    resolved_past_24h: number;
    district_sla_compliance_pct: number;
    critical_sla_breaches: number;
    citizen_trust_index: number;
    active_directives_count: number;
    active_departments_count: number;
  };
  departments_league: DepartmentLeagueEntry[];
  executive_directives: ExecutiveDirective[];
  eoc_alert_level: string;
  district_name: string;
}

const FALLBACK_DATA: AdminOverviewData = {
  metrics: {
    district_name: "Krishnapur District",
    total_open_grievances: 135,
    resolved_past_24h: 106,
    district_sla_compliance_pct: 92.0,
    critical_sla_breaches: 8,
    citizen_trust_index: 4.32,
    active_directives_count: 3,
    active_departments_count: 6,
  },
  departments_league: [
    {
      dept_id: "DEPT-03",
      department_name: "District Police & Law Enforcement",
      department_code: "POLICE",
      head_officer_name: "Insp. Mohan Das",
      open_tickets: 14,
      resolved_today: 31,
      sla_compliance_pct: 98.1,
      avg_resolution_hours: 3.8,
      citizen_rating: 4.6,
      critical_breaches: 0,
      status_trend: "STABLE",
    },
    {
      dept_id: "DEPT-02",
      department_name: "Public Health & Primary Care Directorate",
      department_code: "HEALTH",
      head_officer_name: "Dr. Ananya Iyer",
      open_tickets: 19,
      resolved_today: 22,
      sla_compliance_pct: 96.8,
      avg_resolution_hours: 9.5,
      citizen_rating: 4.7,
      critical_breaches: 0,
      status_trend: "IMPROVING",
    },
    {
      dept_id: "DEPT-06",
      department_name: "Electricity & Street Lighting Board",
      department_code: "ELECTRICITY",
      head_officer_name: "Er. Naveen Hegde",
      open_tickets: 17,
      resolved_today: 12,
      sla_compliance_pct: 94.2,
      avg_resolution_hours: 12.1,
      citizen_rating: 4.3,
      critical_breaches: 1,
      status_trend: "IMPROVING",
    },
    {
      dept_id: "DEPT-01",
      department_name: "Road Infrastructure & Public Works (PWD)",
      department_code: "ROADS",
      head_officer_name: "Er. Rajesh Kumar",
      open_tickets: 28,
      resolved_today: 14,
      sla_compliance_pct: 92.4,
      avg_resolution_hours: 18.2,
      citizen_rating: 4.4,
      critical_breaches: 1,
      status_trend: "IMPROVING",
    },
    {
      dept_id: "DEPT-05",
      department_name: "Sanitation & Solid Waste Management",
      department_code: "SANITATION",
      head_officer_name: "Sri K. Somanna",
      open_tickets: 22,
      resolved_today: 19,
      sla_compliance_pct: 89.0,
      avg_resolution_hours: 16.0,
      citizen_rating: 4.1,
      critical_breaches: 2,
      status_trend: "STABLE",
    },
    {
      dept_id: "DEPT-04",
      department_name: "Water Supply & Underground Drainage",
      department_code: "WATER",
      head_officer_name: "Er. P. Venkatesh",
      open_tickets: 35,
      resolved_today: 8,
      sla_compliance_pct: 81.5,
      avg_resolution_hours: 29.4,
      citizen_rating: 3.8,
      critical_breaches: 4,
      status_trend: "ACTION_NEEDED",
    },
  ],
  executive_directives: [
    {
      directive_id: "DIR-2026-0089",
      title: "Immediate Desilting of Old Fort Canal Backwaters",
      target_department: "Water Supply & Underground Drainage",
      issued_to_name: "Er. P. Venkatesh",
      priority: "URGENT",
      issued_date: "2026-09-27",
      compliance_deadline: "2026-09-30",
      status: "IN_PROGRESS",
      instructions: "Mobilize 4 high-capacity jetting pumps to clear blockages along Old Fort Canal to mitigate Ward 4 flood risk.",
    },
    {
      directive_id: "DIR-2026-0088",
      title: "Intensified Night Fogging for Vector Control in Kuvempu Nagar",
      target_department: "Public Health & Primary Care Directorate",
      issued_to_name: "Dr. Ananya Iyer",
      priority: "HIGH",
      issued_date: "2026-09-26",
      compliance_deadline: "2026-09-29",
      status: "COMPLIED_VERIFIED",
      instructions: "Execute anti-larval spray and cold fogging across all 7 crosses of Ward 3 following dengue cluster report.",
    },
  ],
  eoc_alert_level: "LEVEL_1_ADVISORY",
  district_name: "Krishnapur District",
};

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetDeptPrefill, setTargetDeptPrefill] = useState("");

  const [directiveForm, setDirectiveForm] = useState({
    title: "",
    target_department: "Road Infrastructure & Public Works (PWD)",
    issued_to_name: "Department Head",
    priority: "URGENT",
    compliance_days: 2,
    instructions: "",
  });

  // Fetch live overview
  const { data: adminData = FALLBACK_DATA, isLoading, refetch } = useQuery<AdminOverviewData>({
    queryKey: ["admin-ops-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/admin-ops/overview");
        return res.data;
      } catch {
        return FALLBACK_DATA;
      }
    },
    refetchInterval: 12000,
  });

  // Issue Directive Mutation
  const directiveMutation = useMutation({
    mutationFn: async (payload: typeof directiveForm) => {
      const res = await api.post("/admin-ops/directives", payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Executive directive dispatched successfully");
      setShowDirectiveModal(false);
      setDirectiveForm({
        title: "",
        target_department: "Road Infrastructure & Public Works (PWD)",
        issued_to_name: "Department Head",
        priority: "URGENT",
        compliance_days: 2,
        instructions: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-ops-overview"] });
    },
    onError: () => {
      toast.error("Failed to issue directive. Please verify fields.");
    },
  });

  // Update EOC Alert Level Mutation
  const alertMutation = useMutation({
    mutationFn: async (newLevel: string) => {
      const res = await api.post("/admin-ops/alert-level", { alert_level: newLevel });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "EOC Emergency Alert updated");
      setShowAlertModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin-ops-overview"] });
    },
    onError: () => {
      toast.error("Failed to update emergency alert status");
    },
  });

  const m = adminData.metrics;

  const chartDeptData = adminData.departments_league.map((d) => ({
    name: d.department_code,
    open: d.open_tickets,
    resolved: d.resolved_today,
  }));

  const byStatus = [
    { name: "Reported", value: 45 },
    { name: "In Progress", value: 38 },
    { name: "Evidence Review", value: 24 },
    { name: "Resolved Today", value: m.resolved_past_24h || 106 },
    { name: "Critical Escalations", value: m.critical_sla_breaches || 8 },
  ];

  const getAlertBadge = (lvl: string) => {
    switch (lvl) {
      case "LEVEL_3_RED_ALERT":
        return { label: "LEVEL 3 — RED EMERGENCY", bg: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" };
      case "LEVEL_2_WARNING":
        return { label: "LEVEL 2 — AMBER WARNING", bg: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
      case "LEVEL_1_ADVISORY":
        return { label: "LEVEL 1 — CIVIC ADVISORY", bg: "bg-blue-500/20 text-blue-400 border-blue-500/40" };
      default:
        return { label: "LEVEL 0 — NORMAL OPERATIONS", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
    }
  };

  const alertBadge = getAlertBadge(adminData.eoc_alert_level);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">JANASEVA OS</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  DISTRICT COLLECTORATE
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Office of District Magistrate & District Election Officer</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setShowAlertModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity ${alertBadge.bg}`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>EOC: {alertBadge.label}</span>
              <span className="underline ml-1">Change</span>
            </button>
            <Link
              href="/admin/map"
              className="text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>District GIS Map</span>
            </Link>
            <Link
              href="/admin/emergency"
              className="text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>EOC War Room</span>
            </Link>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/login" className="text-gray-400 hover:text-rose-400 transition-colors ml-2">
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* District Governance Header Banner */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-gray-900 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                DISTRICT ADMINISTRATION & COLLECTOR OPS
              </span>
              <span className="text-xs text-gray-400">Live Census: 1.48 Million Residents</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {adminData.district_name} Command Console
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl">
              Cross-agency oversight across 6 civic departments. Enforce administrative SLAs, dispatch binding executive directives, and monitor district crisis alert levels.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setTargetDeptPrefill("");
                setShowDirectiveModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-102"
            >
              <Send className="w-4 h-4" />
              <span>Issue Executive Directive</span>
            </button>
            <Link
              href="/admin/assistant"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Collector AI Briefing</span>
            </Link>
          </div>
        </div>

        {/* 6 Key Macro Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-gray-900/90 border border-white/10 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Open Backlog</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{m.total_open_grievances}</div>
            <div className="text-[11px] text-gray-400 mt-1">Across 6 depts</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/90 border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Resolved (24h)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">+{m.resolved_past_24h}</div>
            <div className="text-[11px] text-gray-400 mt-1">High dispatch rate</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/90 border border-white/10 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">District SLA %</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-400">{m.district_sla_compliance_pct}%</div>
            <div className="text-[11px] text-gray-400 mt-1">Target &gt; 90.0%</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/90 border border-rose-500/30 bg-rose-950/10">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-rose-300">SLA Breaches</span>
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{m.critical_sla_breaches}</div>
            <div className="text-[11px] text-rose-300/70 mt-1">Requires DM notice</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/90 border border-white/10 hover:border-yellow-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium">Citizen Trust</span>
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
            </div>
            <div className="text-2xl font-bold text-yellow-400">{m.citizen_trust_index} <span className="text-sm font-normal text-gray-400">/ 5.0</span></div>
            <div className="text-[11px] text-gray-400 mt-1">From 4,820 ratings</div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/90 border border-purple-500/30 bg-purple-950/10">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-purple-300">Active Directives</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300">{m.active_directives_count}</div>
            <div className="text-[11px] text-purple-300/70 mt-1">Collector compliance</div>
          </div>
        </div>

        {/* Section 1: Department League Performance Table */}
        <div className="mb-10 rounded-3xl bg-gray-900 border border-white/10 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Department Governance League Ranking</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time performance ranking based on citizen SLA adherence, turnaround velocity, and public satisfaction
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span> 95%+ Elite
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-400 ml-2"></span> 90-94% Standard
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400 ml-2"></span> &lt;90% Escalated
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Rank & Department</th>
                  <th className="py-3.5 px-4">Designated Head</th>
                  <th className="py-3.5 px-4 text-center">Open Backlog</th>
                  <th className="py-3.5 px-4 text-center">Resolved (24h)</th>
                  <th className="py-3.5 px-4">SLA Compliance</th>
                  <th className="py-3.5 px-4 text-center">Avg Velocity</th>
                  <th className="py-3.5 px-4 text-center">Citizen Rating</th>
                  <th className="py-3.5 px-4 text-center">Trend</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {adminData.departments_league.map((dept, index) => {
                  const isUnderperforming = dept.sla_compliance_pct < 88.0 || dept.critical_breaches > 2;
                  return (
                    <tr
                      key={dept.dept_id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isUnderperforming ? "bg-rose-950/[0.06]" : ""
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              index === 0
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : index === 1
                                ? "bg-slate-300/20 text-slate-300 border border-slate-300/40"
                                : index === 2
                                ? "bg-amber-700/20 text-amber-400 border border-amber-700/40"
                                : "bg-gray-800 text-gray-400 border border-white/5"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{dept.department_name}</div>
                            <span className="text-[11px] text-gray-400 font-mono">{dept.department_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-300">{dept.head_officer_name}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-amber-400">{dept.open_tickets}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-emerald-400">+{dept.resolved_today}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-36">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold">{dept.sla_compliance_pct}%</span>
                            {dept.critical_breaches > 0 && (
                              <span className="text-[10px] text-rose-400 font-semibold">
                                {dept.critical_breaches} breach{dept.critical_breaches > 1 ? "es" : ""}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dept.sla_compliance_pct >= 95
                                  ? "bg-emerald-500"
                                  : dept.sla_compliance_pct >= 90
                                  ? "bg-indigo-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(dept.sla_compliance_pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-mono text-gray-300">
                        {dept.avg_resolution_hours}h
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          <span>{dept.citizen_rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            dept.status_trend === "IMPROVING"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : dept.status_trend === "ACTION_NEEDED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {dept.status_trend.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setDirectiveForm({
                              ...directiveForm,
                              target_department: dept.department_name,
                              issued_to_name: dept.head_officer_name,
                              title: `Expedite Resolution of ${dept.department_code} Backlog & SLA Compliance`,
                            });
                            setShowDirectiveModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
                        >
                          Directive →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Executive Directives Log & Two Charts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {/* Executive Directives Stream (2 Cols) */}
          <div className="lg:col-span-2 rounded-3xl bg-gray-900 border border-white/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Binding Executive Directives (DM Orders)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Statutory executive orders issued under Disaster Management Act & District Administration code
                </p>
              </div>
              <button
                onClick={() => {
                  setTargetDeptPrefill("");
                  setShowDirectiveModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Directive</span>
              </button>
            </div>

            <div className="space-y-3">
              {adminData.executive_directives.map((dir) => (
                <div
                  key={dir.directive_id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-purple-400 font-bold">{dir.directive_id}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            dir.priority === "URGENT"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {dir.priority}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            dir.status === "COMPLIED_VERIFIED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : dir.status === "IN_PROGRESS"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {dir.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{dir.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{dir.instructions}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-300">To: {dir.target_department}</span>
                      <span>•</span>
                      <span>Officer: {dir.issued_to_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Issued: {dir.issued_date}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">Deadline: {dir.compliance_deadline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Analytics & Chart (1 Col) */}
          <div className="rounded-3xl bg-gray-900 border border-white/10 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Backlog by Department</h2>
              <p className="text-xs text-gray-400 mb-4">Open vs Resolved in last 24 hours</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartDeptData} barSize={12}>
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="open" fill="#f97316" radius={[4, 4, 0, 0]} name="Open" />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-xs font-semibold text-gray-400 mb-2">QUICK DEPARTMENT DASHBOARD ACCESS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/health/dashboard"
                  className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-900/30 flex items-center justify-between transition-colors"
                >
                  <span>🏥 Health (CMHO)</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/police/dashboard"
                  className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 hover:bg-rose-900/30 flex items-center justify-between transition-colors"
                >
                  <span>🚓 Police (112 CAD)</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/officer/dashboard"
                  className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-300 hover:bg-blue-900/30 flex items-center justify-between transition-colors"
                >
                  <span>🏗️ Civic/PWD Desk</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/admin/map"
                  className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-300 hover:bg-purple-900/30 flex items-center justify-between transition-colors"
                >
                  <span>🗺️ District GIS</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Issue Executive Directive */}
      {showDirectiveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowDirectiveModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Issue District Magistrate Directive</h3>
                <p className="text-xs text-gray-400">Statutory binding executive order to Department Head</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                directiveMutation.mutate(directiveForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target Department</label>
                <select
                  value={directiveForm.target_department}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, target_department: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Road Infrastructure & Public Works (PWD)">Road Infrastructure & Public Works (PWD)</option>
                  <option value="Public Health & Primary Care Directorate">Public Health & Primary Care Directorate</option>
                  <option value="District Police & Law Enforcement">District Police & Law Enforcement</option>
                  <option value="Water Supply & Underground Drainage">Water Supply & Underground Drainage</option>
                  <option value="Sanitation & Solid Waste Management">Sanitation & Solid Waste Management</option>
                  <option value="Electricity & Street Lighting Board">Electricity & Street Lighting Board</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Target Officer / Head</label>
                  <input
                    type="text"
                    value={directiveForm.issued_to_name}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, issued_to_name: e.target.value })}
                    required
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Priority</label>
                  <select
                    value={directiveForm.priority}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, priority: e.target.value })}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="URGENT">URGENT (24-48h)</option>
                    <option value="HIGH">HIGH (3-5 days)</option>
                    <option value="ROUTINE">ROUTINE (7 days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Directive Subject / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Immediate repair of breaches along River Ward embankment"
                  value={directiveForm.title}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, title: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Compliance Days</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={directiveForm.compliance_days}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, compliance_days: parseInt(e.target.value) || 2 })}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Operational Instructions & Mandate</label>
                <textarea
                  rows={3}
                  placeholder="Specific actions required, machinery deployment, field inspection mandate, and penalty for non-compliance..."
                  value={directiveForm.instructions}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, instructions: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDirectiveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directiveMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{directiveMutation.isPending ? "Issuing..." : "Dispatch Executive Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change EOC Alert Level */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowAlertModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">District EOC Alert Status</h3>
                <p className="text-xs text-gray-400">Set district-wide emergency response preparedness</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  level: "NORMAL",
                  title: "Level 0 — Normal Civic Operations",
                  desc: "All civic departments operating under standard SLA timelines.",
                  color: "hover:border-emerald-500/50 hover:bg-emerald-950/20",
                },
                {
                  level: "LEVEL_1_ADVISORY",
                  title: "Level 1 — Civic Advisory",
                  desc: "Heightened surveillance for heavy rains, heatwaves, or local disease clusters.",
                  color: "hover:border-blue-500/50 hover:bg-blue-950/20",
                },
                {
                  level: "LEVEL_2_WARNING",
                  title: "Level 2 — Amber Warning",
                  desc: "Emergency standby for all quick response teams, hospital beds reserved.",
                  color: "hover:border-amber-500/50 hover:bg-amber-950/20",
                },
                {
                  level: "LEVEL_3_RED_ALERT",
                  title: "Level 3 — Red Emergency Alert",
                  desc: "District Emergency Operations Center fully activated. Priority dispatch across all agencies.",
                  color: "hover:border-rose-500/50 hover:bg-rose-950/20",
                },
              ].map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => alertMutation.mutate(opt.level)}
                  disabled={alertMutation.isPending}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    adminData.eoc_alert_level === opt.level
                      ? "border-purple-500 bg-purple-950/30"
                      : "border-white/10 bg-gray-800/40"
                  } ${opt.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{opt.title}</span>
                    {adminData.eoc_alert_level === opt.level && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
