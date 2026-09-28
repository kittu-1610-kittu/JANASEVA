"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  ShieldAlert,
  Sparkles,
  ArrowRight,
  User,
  HardHat,
  Briefcase,
  Shield,
  Stethoscope,
  HeartHandshake,
  Check,
  Lock,
  Mail,
  Zap,
} from "lucide-react";
import api, { setTokens } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const ROLE_REDIRECTS: Record<string, string> = {
  CITIZEN: "/citizen/dashboard",
  FIELD_WORKER: "/field/dashboard",
  DEPARTMENT_OFFICER: "/officer/dashboard",
  POLICE_OFFICER: "/police/dashboard",
  HEALTH_OFFICER: "/health/dashboard",
  NGO: "/ngo/dashboard",
  VOLUNTEER: "/field/dashboard",
  DISTRICT_ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

interface DemoPersona {
  role: string;
  name: string;
  email: string;
  desc: string;
  icon: typeof User;
  badgeColor: string;
  targetDashboard: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: "Citizen",
    name: "Priya Sharma",
    email: "citizen@demo.janaseva.in",
    desc: "File complaints, track progress & welfare schemes",
    icon: User,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    targetDashboard: "/citizen/dashboard",
  },
  {
    role: "Department Officer",
    name: "Rajesh Kumar",
    email: "officer@demo.janaseva.in",
    desc: "Triage civic grievances, dispatch equipment & inspect proof",
    icon: Briefcase,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    targetDashboard: "/officer/dashboard",
  },
  {
    role: "Field Worker",
    name: "Suresh Naidu",
    email: "field@demo.janaseva.in",
    desc: "Inspect on-site issues & upload resolution proof",
    icon: HardHat,
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    targetDashboard: "/field/dashboard",
  },
  {
    role: "District Admin",
    name: "Kavitha Reddy",
    email: "admin@demo.janaseva.in",
    desc: "Multi-agency governance, departmental SLA league & EOC alerts",
    icon: Shield,
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    targetDashboard: "/admin/dashboard",
  },
  {
    role: "Police Officer",
    name: "Insp. Mohan Das",
    email: "police@demo.janaseva.in",
    desc: "112 SOS panic distress CAD, PCR patrol fleet & cordons",
    icon: ShieldAlert,
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    targetDashboard: "/police/dashboard",
  },
  {
    role: "Health Officer",
    name: "Dr. Ananya Iyer",
    email: "health@demo.janaseva.in",
    desc: "Hospital ICU/bed matrix, 108 CAD fleet & outbreak surveillance",
    icon: Stethoscope,
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    targetDashboard: "/health/dashboard",
  },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillEmail = params.get("email") ?? "";
  const redirectTo = params.get("redirect") ?? "";

  const [selectedPersona, setSelectedPersona] = useState<string>(
    prefillEmail || "citizen@demo.janaseva.in"
  );
  const [quickLoggingIn, setQuickLoggingIn] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: prefillEmail || "citizen@demo.janaseva.in",
      password: "Demo@1234",
    },
  });

  useEffect(() => {
    if (prefillEmail) {
      setValue("email", prefillEmail);
      setValue("password", "Demo@1234");
      setSelectedPersona(prefillEmail);
    }
  }, [prefillEmail, setValue]);

  const executeLogin = async (data: FormData) => {
    try {
      const { data: tokens } = await api.post("/auth/login", data);
      setTokens(tokens.access_token, tokens.refresh_token);

      // Get user profile
      const { data: me } = await api.get("/auth/me");
      const role = me.primary_role as string;
      const dest = redirectTo || ROLE_REDIRECTS[role] || "/citizen/dashboard";

      toast.success(`Welcome, ${me.full_name}!`, {
        description: `Logged in as ${role.replace("_", " ")}`,
      });

      router.push(dest);
    } catch (err: any) {
      const msg =
        err?.apiError?.message ??
        err?.message ??
        "Login failed. Please check credentials or backend status.";
      toast.error("Authentication Notice", {
        description: msg,
      });
    }
  };

  const handleSelectPersona = (persona: DemoPersona, autoSubmit = false) => {
    setSelectedPersona(persona.email);
    setValue("email", persona.email);
    setValue("password", "Demo@1234");
    if (autoSubmit) {
      setQuickLoggingIn(persona.email);
      executeLogin({ email: persona.email, password: "Demo@1234" }).finally(() => {
        setQuickLoggingIn(null);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-brand-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="bg-slate-900/80 border-b border-indigo-500/20 backdrop-blur-md px-4 py-2 text-center text-xs text-slate-300 flex items-center justify-center gap-2 z-10">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">JANASEVA OS Prototype</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400">Click any demo account card below for 1-Click Instant Login</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Main Access */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Link href="/" className="inline-flex items-center gap-2 group mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-indigo-500/20">
                  JS
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      JANASEVA
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1 py-0.5 rounded">
                      OS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">District Public Service Platform</p>
                </div>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Sign in to your account
              </h1>
              <p className="text-sm text-slate-400">
                Access your citizen portal, operational desk, or emergency coordination center.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <form onSubmit={handleSubmit(executeLogin)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register("email")}
                      type="email"
                      autoComplete="email"
                      placeholder="name@demo.janaseva.in"
                      className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-rose-400" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-xs text-slate-500">
                      Demo password: <code className="text-indigo-400 font-mono">Demo@1234</code>
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register("password")}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-rose-400" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || quickLoggingIn !== null}
                  className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 disabled:from-indigo-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>New to Janaseva OS?</span>
                <Link
                  href="/login"
                  onClick={() => handleSelectPersona(DEMO_PERSONAS[0], true)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Explore as Demo Citizen →
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <Link href="/" className="hover:text-slate-300 transition-colors">
                ← Back to Home
              </Link>
              <span>Demo Prototype v1.0.0</span>
            </div>
          </div>

          {/* Right Column: Interactive Demo Accounts Grid */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Select Demo Persona
                </h2>
                <p className="text-xs text-slate-400">
                  Click any role card for immediate 1-click access
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_PERSONAS.map((persona) => {
                const Icon = persona.icon;
                const isSelected = selectedPersona === persona.email;
                const isThisLoading = quickLoggingIn === persona.email;

                return (
                  <div
                    key={persona.email}
                    onClick={() => handleSelectPersona(persona, false)}
                    className={`relative p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
                        : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${persona.badgeColor}`}
                        >
                          {persona.role}
                        </span>
                      </div>

                      <div className="font-semibold text-white text-sm mb-0.5">
                        {persona.name}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-400/90 mb-2 truncate">
                        {persona.email}
                      </div>
                      <p className="text-xs text-slate-400 leading-snug mb-3">
                        {persona.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPersona(persona, true);
                        }}
                        disabled={quickLoggingIn !== null}
                        className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        {isThisLoading ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>1-Click Sign In</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                All 6 role accounts are pre-configured with realistic synthetic district data.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
