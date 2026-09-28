"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";

interface MatchedCriterion {
  rule_key: string;
  citizen_value: string;
  required_value: string;
  matched: boolean;
}

interface SchemeMatch {
  scheme_id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  benefits: string;
  required_documents: string[];
  application_url: string | null;
  matched_criteria: MatchedCriterion[];
  match_score: number;
  disclaimer: string;
}

export default function WelfarePage() {
  const [age, setAge] = useState<number>(35);
  const [occupation, setOccupation] = useState<string>("FARMER");
  const [incomeBracket, setIncomeBracket] = useState<string>("BPL");
  const [caste, setCaste] = useState<string>("OBC");
  const [ownsPuccaHouse, setOwnsPuccaHouse] = useState<boolean>(false);
  const [landHolding, setLandHolding] = useState<number>(1.5);

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/welfare/match", {
        age: Number(age),
        occupation,
        income_bracket: incomeBracket,
        caste_category: caste,
        owns_pucca_house: ownsPuccaHouse,
        land_holding_hectare: Number(landHolding),
      });
      return res.data as SchemeMatch[];
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Eligibility check failed");
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/citizen/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Dashboard
            </Link>
            <span className="text-gray-600">/</span>
            <span className="font-semibold text-sm">Welfare &amp; Scheme Discovery</span>
          </div>
          <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
            Transparent Rules Matching
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Government Welfare Schemes</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Input your socioeconomic profile to instantly discover eligible central and state government schemes. 
            All matching criteria are auditable with transparent checklists.
          </p>
        </div>

        {/* Profile Inputs */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold mb-4 text-white">Your Profile Parameters</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Age</label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Occupation</label>
              <select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="FARMER">Farmer / Agriculture</option>
                <option value="STUDENT">Student</option>
                <option value="UNEMPLOYED">Unemployed / Job Seeker</option>
                <option value="ARTISAN">Artisan / Weaver</option>
                <option value="CONSTRUCTION_WORKER">Construction Worker</option>
                <option value="SELF_EMPLOYED">Small Business / Self-Employed</option>
                <option value="SENIOR_CITIZEN">Senior Citizen / Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Income Bracket</label>
              <select
                value={incomeBracket}
                onChange={(e) => setIncomeBracket(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="EWS">EWS (Below ₹1 Lakh)</option>
                <option value="BPL">BPL (Below Poverty Line)</option>
                <option value="LIG">LIG (₹1L - ₹3L)</option>
                <option value="MIG-I">MIG-I (₹3L - ₹6L)</option>
                <option value="ABOVE">Above ₹6 Lakh</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Social Category</label>
              <select
                value={caste}
                onChange={(e) => setCaste(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="GENERAL">General</option>
                <option value="OBC">OBC (Other Backward Classes)</option>
                <option value="SC">SC (Scheduled Caste)</option>
                <option value="ST">ST (Scheduled Tribe)</option>
                <option value="MINORITY">Minority Community</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Agricultural Land (Hectares)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={landHolding}
                onChange={(e) => setLandHolding(Number(e.target.value))}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Owns Pucca / Concrete House?</label>
              <select
                value={ownsPuccaHouse ? "yes" : "no"}
                onChange={(e) => setOwnsPuccaHouse(e.target.value === "yes")}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="no">No (Kutcha / Rented / None)</option>
                <option value="yes">Yes (Owns Pucca House)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => matchMutation.mutate()}
              disabled={matchMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              {matchMutation.isPending ? "Calculating Eligibility..." : "🔍 Find Eligible Schemes"}
            </button>
          </div>
        </div>

        {/* Results */}
        {matchMutation.data && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Matching Schemes ({matchMutation.data.length} found)
              </h2>
              <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-full">
                ⚠️ Verification required officially before sanction
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {matchMutation.data.map((scheme) => (
                <div
                  key={scheme.code}
                  className="bg-gray-900 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">
                        {scheme.code}
                      </span>
                      <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded-full font-semibold">
                        {Math.round(scheme.match_score * 100)}% Criteria Met
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-white mb-2">{scheme.name}</h3>
                    <p className="text-xs text-gray-300 mb-4 leading-relaxed">{scheme.description}</p>

                    <div className="p-3 bg-gray-950 rounded-xl border border-white/5 mb-4">
                      <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide mb-1">
                        Benefits
                      </div>
                      <div className="text-xs text-gray-200">{scheme.benefits}</div>
                    </div>

                    {/* Criteria Evaluation Checklist */}
                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Criteria Evaluation
                      </div>
                      <div className="space-y-1.5">
                        {scheme.matched_criteria.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-gray-950/60 px-2.5 py-1.5 rounded-lg border border-white/5">
                            <span className="text-gray-300 capitalize">{c.rule_key.replace(/_/g, " ")}:</span>
                            <span className="font-mono text-gray-400 text-[11px]">
                              Req: {c.required_value} | Yours: {c.citizen_value}
                            </span>
                            <span className={c.matched ? "text-emerald-400 font-bold ml-2" : "text-red-400 font-bold ml-2"}>
                              {c.matched ? "✓" : "✗"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Required Documents */}
                    {scheme.required_documents && scheme.required_documents.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                          Required Documents
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {scheme.required_documents.map((doc, idx) => (
                            <span key={idx} className="text-[11px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                              📄 {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 italic max-w-xs">{scheme.disclaimer}</span>
                    {scheme.application_url && (
                      <a
                        href={scheme.application_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                      >
                        Apply Online →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
