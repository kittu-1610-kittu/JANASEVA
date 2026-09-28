"use client";

import * as React from "react";
import Link from "next/link";
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
  Badge,
  Input,
  Textarea,
  Modal,
  StatCard,
  Tabs,
  Timeline,
} from "@/components/ui";
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  Activity,
  Layers,
  Palette,
  Sliders,
  Cpu,
} from "lucide-react";

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = React.useState("components");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const sampleTimelineSteps = [
    {
      id: "1",
      title: "Grievance Registered",
      description: "AI automatically classified category as POTHOLE and routed to Roads & Bridges Department.",
      date: "27 Sep, 10:30 AM",
      status: "completed" as const,
      officer: "AI Dispatcher Engine",
    },
    {
      id: "2",
      title: "Officer Verified & Assigned",
      description: "Ward 14 Junior Engineer allocated work order #WO-8921 to Field Repair Crew Alpha.",
      date: "27 Sep, 11:15 AM",
      status: "completed" as const,
      officer: "K. Ramesh (Assistant Executive Engineer)",
    },
    {
      id: "3",
      title: "Field Crew On-Site Inspection",
      description: "Repair crew arrived with asphalt compaction vehicle. Cold-mix patch in progress.",
      date: "27 Sep, 02:45 PM",
      status: "current" as const,
      officer: "Field Unit Lead: Suresh G.",
    },
    {
      id: "4",
      title: "Citizen Resolution Verification",
      description: "Before-and-after photographic evidence will be matched with GPS timestamp.",
      date: "Estimated: Today 06:00 PM",
      status: "upcoming" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern pb-20">
      <EmergencyBanner />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-brand-950/60 via-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>JANASEVA OS — Design System & UI/UX Guidelines</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Civic Technology Design System
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              A high-precision, accessible, and resilient design language built for district governance, real-time emergency dispatch, and citizen grievance workflows.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Sliders className="h-4 w-4" />}
              >
                Open Interactive Modal
              </Button>
              <Link href="/">
                <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Back to Platform Home
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <Tabs
            tabs={[
              { id: "components", label: "UI Components", icon: <Layers className="h-4 w-4" />, count: 12 },
              { id: "tokens", label: "Color & Typography", icon: <Palette className="h-4 w-4" /> },
              { id: "lifecycle", label: "Civic Stepper & SLA", icon: <Activity className="h-4 w-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* TAB 1: UI COMPONENTS */}
        {activeTab === "components" && (
          <div className="space-y-10">
            {/* KPI Stat Cards Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-400" />
                <h2 className="text-xl font-bold text-white">KPI Stat Cards</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Grievances"
                  value="1,482"
                  change={12.4}
                  variant="brand"
                  icon={<Layers className="h-5 w-5" />}
                />
                <StatCard
                  title="Active Emergencies"
                  value="3"
                  change={-25.0}
                  variant="emergency"
                  icon={<Flame className="h-5 w-5" />}
                />
                <StatCard
                  title="Avg Resolution Time"
                  value="18.4 hrs"
                  change={-8.5}
                  variant="success"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <StatCard
                  title="SLA Compliance Rate"
                  value="94.2%"
                  change={2.1}
                  variant="warning"
                  icon={<ShieldCheck className="h-5 w-5" />}
                />
              </div>
            </section>

            {/* Buttons Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">Interactive Buttons</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Button Hierarchy & Variants</CardTitle>
                  <CardDescription>
                    Tailored button states with support for glowing effects, emergency priority animations, and loading spinners.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button variant="default">Default Button</Button>
                    <Button variant="primary">Primary Gradient</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="outline">Outline Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="destructive">Destructive Action</Button>
                    <Button variant="emergency" leftIcon={<Flame className="h-4 w-4" />}>
                      Emergency SOS
                    </Button>
                    <Button variant="success">Success Action</Button>
                    <Button variant="primary" isLoading>
                      Processing
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800">
                    <Button size="sm">Small Size (sm)</Button>
                    <Button size="default">Default Size (md)</Button>
                    <Button size="lg">Large Size (lg)</Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Status Badges Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">Civic Status Badges</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Priority & Workflow Badges</CardTitle>
                  <CardDescription>
                    Semantic color indicators with live pulsating status dots for triage clarity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="emergency">EMERGENCY SOS</Badge>
                    <Badge variant="critical">CRITICAL PRIORITY</Badge>
                    <Badge variant="high">HIGH PRIORITY</Badge>
                    <Badge variant="medium">MEDIUM PRIORITY</Badge>
                    <Badge variant="low">LOW PRIORITY</Badge>
                    <Badge variant="success">RESOLVED</Badge>
                    <Badge variant="warning">UNDER REVIEW</Badge>
                    <Badge variant="info">AI CLASSIFIED</Badge>
                    <Badge variant="outline">ARCHIVED</Badge>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Form Controls Section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">Form Inputs & Field Elements</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Text Inputs & Search</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Citizen Full Name"
                      placeholder="e.g. Ramesh Kumar"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <Input
                      label="Search District Records"
                      placeholder="Search complaints, wards, schemes..."
                      leftIcon={<Search className="h-4 w-4" />}
                    />
                    <Input
                      label="Invalid Input Demo"
                      defaultValue="invalid-phone-format"
                      error="Please enter a valid 10-digit Indian phone number."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Multitext & Detailed Grievance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      label="Grievance Description"
                      placeholder="Describe the public service issue, exact landmark, and hazardous conditions..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: COLOR & TYPOGRAPHY */}
        {activeTab === "tokens" && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Primary Design Tokens</CardTitle>
                <CardDescription>Tailored HSL color palette engineered for dark mode legibility and civic contrast.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Brand Palette (Indigo / Tech)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="h-16 rounded-xl bg-brand-500 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      brand-500
                    </div>
                    <div className="h-16 rounded-xl bg-brand-600 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      brand-600
                    </div>
                    <div className="h-16 rounded-xl bg-brand-700 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      brand-700
                    </div>
                    <div className="h-16 rounded-xl bg-brand-800 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      brand-800
                    </div>
                    <div className="h-16 rounded-xl bg-brand-900 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      brand-900
                    </div>
                    <div className="h-16 rounded-xl bg-brand-950 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md border border-slate-800">
                      brand-950
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Emergency & Safety Alerts</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="h-16 rounded-xl bg-rose-600 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      rose-600 (Emergency)
                    </div>
                    <div className="h-16 rounded-xl bg-amber-500 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      amber-500 (Warning)
                    </div>
                    <div className="h-16 rounded-xl bg-emerald-500 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      emerald-500 (Success)
                    </div>
                    <div className="h-16 rounded-xl bg-indigo-500 flex flex-col justify-end p-2 text-xs font-bold text-white shadow-md">
                      indigo-500 (AI Routing)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: LIFECYCLE & STEPPER */}
        {activeTab === "lifecycle" && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Citizen Grievance Resolution Lifecycle</CardTitle>
                <CardDescription>
                  Full deterministic state machine with audit trails, assigned department officers, and timestamp milestones.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Timeline steps={sampleTimelineSteps} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Interactive Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Interactive Modal Dialog"
          description="Accessible, backdrop-blurred dialog with ESC keyboard support and responsive layout."
          footer={
            <>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              This modal component provides smooth backdrop blurring, accessibility hooks, focus trap handling, and customizable headers and footers.
            </p>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
              💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-white">Esc</kbd> to dismiss this dialog instantly.
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
