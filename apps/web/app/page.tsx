import Link from "next/link";
import type { Metadata } from "next";
import {
  Navbar,
  EmergencyBanner,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  Badge,
} from "@/components/ui";
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  MapPin,
  Bot,
  Activity,
  Layers,
  HeartHandshake,
  CheckCircle2,
  Lock,
  Compass,
} from "lucide-react";

export const metadata: Metadata = {
  title: "JANASEVA — District Public Service & Emergency Operations",
  description:
    "AI-assisted civic operating system for real-time grievance redressal, GIS command dispatch, and emergency coordination.",
};

const DEMO_ROLES = [
  {
    label: "Citizen Portal",
    role: "CITIZEN",
    email: "citizen@demo.janaseva.in",
    path: "/citizen/complaints/new",
    icon: "👤",
    gradient: "from-blue-600 to-indigo-600",
    desc: "Submit grievances, track live lifecycle milestones, and discover welfare schemes.",
  },
  {
    label: "Department Officer",
    role: "OFFICER",
    email: "officer@demo.janaseva.in",
    path: "/officer/dashboard",
    icon: "🏛️",
    gradient: "from-indigo-600 to-violet-600",
    desc: "Triage incoming queue, assign field repair work orders, and review resolution evidence.",
  },
  {
    label: "Field Worker",
    role: "FIELD_WORKER",
    email: "field@demo.janaseva.in",
    path: "/field/dashboard",
    icon: "🔧",
    gradient: "from-amber-600 to-orange-600",
    desc: "Mobile-first on-site task execution with geo-tagged photographic evidence capture.",
  },
  {
    label: "District Admin / Collector",
    role: "DISTRICT_ADMIN",
    email: "admin@demo.janaseva.in",
    path: "/admin/dashboard",
    icon: "📊",
    gradient: "from-purple-600 to-pink-600",
    desc: "District command center, ward SLA compliance monitoring, and high-level analytics.",
  },
  {
    label: "Emergency Commander",
    role: "EMERGENCY_COMMANDER",
    email: "admin@demo.janaseva.in",
    path: "/admin/emergency",
    icon: "🚨",
    gradient: "from-rose-600 to-red-600",
    desc: "EOC coordination, shelter occupancy balancing, and tactical distress dispatch.",
  },
  {
    label: "Civil Society / NGO",
    role: "NGO_COORDINATOR",
    email: "ngo@demo.janaseva.in",
    path: "/ngo/dashboard",
    icon: "🤝",
    gradient: "from-emerald-600 to-teal-600",
    desc: "Surplus food rescue routing, community kitchens, and disaster volunteer rosters.",
  },
];

const CAPABILITIES = [
  {
    icon: <Layers className="h-6 w-6 text-brand-400" />,
    title: "AI Grievance Classifier",
    desc: "Sub-millisecond classification and deterministic routing across 14 municipal departments with 250m spatial duplicate deduplication.",
  },
  {
    icon: <MapPin className="h-6 w-6 text-rose-400" />,
    title: "Tactical GIS Command Map",
    desc: "PostGIS-powered interactive ward boundaries, distress pins, shelter capacities, and real-time emergency responder vehicle locations.",
  },
  {
    icon: <ShieldAlert className="h-6 w-6 text-amber-400" />,
    title: "Disaster Emergency EOC",
    desc: "Single-window emergency incident manager with triage status controls, evacuation zones, and automated siren broadcasts.",
  },
  {
    icon: <Bot className="h-6 w-6 text-indigo-400" />,
    title: "AI Natural Language Command",
    desc: "Governed LLM copilot for district collectors with verified read-only function tools, structured analytics, and zero prompt leakage.",
  },
  {
    icon: <HeartHandshake className="h-6 w-6 text-emerald-400" />,
    title: "Welfare Scheme Matcher",
    desc: "Transparent rules-based eligibility matching for central and state citizen assistance schemes with step-by-step audit checks.",
  },
  {
    icon: <Lock className="h-6 w-6 text-purple-400" />,
    title: "Enterprise RBAC & Audit Trails",
    desc: "Server-enforced role access with tamper-evident audit logging for every status transition, assignment, and evidence upload.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern selection:bg-brand-500/30 selection:text-brand-200">
      {/* Critical District Alert Strip */}
      <EmergencyBanner />

      {/* Main Glass Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[950px] rounded-full bg-gradient-to-tr from-brand-600/20 via-indigo-600/15 to-cyan-500/20 blur-[130px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          {/* Status Capsule */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational Civic Platform • Ballari District Live</span>
          </div>

          {/* Grand JANASEVA Brand Display */}
          <div className="relative inline-block mt-8 mb-4">
            {/* Ambient Radial Lighting Glow */}
            <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-r from-blue-600/30 via-indigo-500/25 to-cyan-400/30 blur-3xl opacity-80 rounded-3xl -z-10 pointer-events-none animate-pulse" />
            
            <h1 className="text-7xl sm:text-9xl lg:text-[10rem] font-black tracking-tight select-none uppercase leading-none">
              <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_12px_40px_rgba(59,130,246,0.35)]">
                JANA
              </span>
              <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_12px_40px_rgba(99,102,241,0.45)]">
                SEVA
              </span>
            </h1>

            {/* Cultural & Institutional Civic Tagline Bar */}
            <div className="flex items-center justify-center gap-3 mt-3 text-xs sm:text-sm font-semibold tracking-widest text-indigo-300/90 uppercase">
              <span className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-indigo-500/60" />
              <span className="text-brand-300 font-bold">ಜನಸೇವಾ</span>
              <span className="text-slate-600">•</span>
              <span>Unified District Public Service &amp; Emergency Platform</span>
              <span className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-indigo-500/60" />
            </div>
          </div>

          {/* Core Mission Heading */}
          <h2 className="mt-6 text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Empowering Citizens. <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent">Accelerating Governance.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            High-precision complaint dispatch, real-time GIS tactical coordination, AI grievance triage, and crisis management designed for modern public administration.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/citizen/complaints/new">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Sparkles className="h-5 w-5" />}
              >
                File Citizen Grievance
              </Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button
                variant="outline"
                size="lg"
                leftIcon={<Activity className="h-5 w-5" />}
              >
                Launch Operations Hub
              </Button>
            </Link>
            <Link href="/design-system">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Compass className="h-5 w-5" />}
              >
                Design System Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* District Live Pulse KPI Metrics */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="District Population"
            value="1.42 M"
            subtitle="Ballari Demonstration District"
            variant="brand"
            icon={<MapPin className="h-5 w-5" />}
          />
          <StatCard
            title="Operational Wards"
            value="48 Wards"
            subtitle="100% GIS geo-fenced"
            variant="default"
            icon={<Layers className="h-5 w-5" />}
          />
          <StatCard
            title="Average Resolution SLA"
            value="16.2 Hours"
            change={-14.8}
            changePeriod="improved vs last month"
            variant="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="Emergency Readiness"
            value="LEVEL 1"
            subtitle="EOC units fully staffed"
            variant="emergency"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Role-Based One-Click Access Matrix */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="info">One-Click Demonstration Access</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Select Your Administrative Role
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Experience role-specific dashboards with authenticated permissions. All demo profiles use credentials:{" "}
            <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-brand-300 border border-slate-800">
              Demo@1234
            </code>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ROLES.map((role) => (
            <Link
              key={role.label}
              href={`/login?email=${encodeURIComponent(role.email)}&redirect=${encodeURIComponent(role.path)}`}
              className="group"
            >
              <Card className="h-full border-slate-800/80 bg-slate-900/60 transition-all duration-300 hover:border-brand-500/40 hover:bg-slate-900/90 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient} text-xl shadow-md`}>
                      {role.icon}
                    </div>
                    <Badge variant="outline" size="sm" dot={false}>
                      {role.role}
                    </Badge>
                  </div>
                  <CardTitle className="pt-3 group-hover:text-brand-300 transition-colors">
                    {role.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {role.desc}
                  </p>
                </CardContent>
                <CardFooter className="justify-between text-xs text-brand-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="border-t border-slate-900 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Civic Infrastructure
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Engineered with modern microservices, PostGIS spatial indexing, and strict privacy safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="glass-card card-hover rounded-2xl border border-slate-800/80 p-6 space-y-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
                  {cap.icon}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            JANASEVA — Unified District Public Service Platform. Demonstration Prototype.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/design-system" className="hover:text-slate-300 transition-colors">
              UI/UX Design System
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              OpenAPI Swagger
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
