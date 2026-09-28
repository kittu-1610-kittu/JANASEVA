"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import api, { clearTokens } from "@/lib/api";

const SAMPLE_FOOD_LISTINGS = [
  {
    id: "f1",
    donor: "Grand Palace Hotel & Banquet",
    servings: 250,
    items: "Rice, Dal Makhani, Mixed Vegetable Curry, Roti",
    prepared_at: "2 hours ago",
    safe_until: "In 4 hours",
    address: "MG Road, Ward 12, Krishnapur",
    status: "AVAILABLE",
  },
  {
    id: "f2",
    donor: "Krishnapur Tech Park Canteen",
    servings: 180,
    items: "Biryani, Raita, Gulab Jamun",
    prepared_at: "1 hour ago",
    safe_until: "In 5 hours",
    address: "IT Corridor, Ward 24, Krishnapur",
    status: "AVAILABLE",
  },
  {
    id: "f3",
    donor: "Community Center Wedding Hall",
    servings: 400,
    items: "Sambar Rice, Poriyal, Curd Rice",
    prepared_at: "3 hours ago",
    safe_until: "In 3 hours",
    address: "Temple Circle, Ward 8, Krishnapur",
    status: "CLAIMED",
  },
];

export default function NGODashboardPage() {
  const [claimedListings, setClaimedListings] = useState<Record<string, boolean>>({
    f3: true,
  });

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data;
    },
  });

  const handleClaim = (id: string, donor: string) => {
    setClaimedListings((prev) => ({ ...prev, [id]: true }));
    toast.success(`Claimed donation from ${donor}! Dispatching volunteer vehicle.`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-md">
              🤝
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">NGO &amp; Community Relief Hub</div>
              <div className="text-xs text-emerald-400">
                {user ? user.full_name : "Helping Hands Relief Network"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/emergency"
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              🚨 Active Emergencies
            </Link>
            <button
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-1">Total Meals Rescued</div>
            <div className="text-3xl font-extrabold text-emerald-400">14,250</div>
            <div className="text-[11px] text-gray-500 mt-1">This month across district</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-1">Surplus Available Now</div>
            <div className="text-3xl font-extrabold text-white">430 Servings</div>
            <div className="text-[11px] text-emerald-400 mt-1">Ready for immediate pickup</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-1">Shelters Served</div>
            <div className="text-3xl font-extrabold text-indigo-400">22 Camps</div>
            <div className="text-[11px] text-gray-500 mt-1">Daily nutrition support</div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-1">Volunteer Fleet</div>
            <div className="text-3xl font-extrabold text-white">18 Vehicles</div>
            <div className="text-[11px] text-gray-400 mt-1">Active distribution vans</div>
          </div>
        </div>

        {/* Live Surplus Food Listings */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Surplus Food Rescue Stream</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time listings from restaurants, banquets, and convention centers.
              </p>
            </div>
            <span className="text-xs bg-emerald-950 border border-emerald-800/40 text-emerald-300 px-3 py-1 rounded-full font-semibold">
              Live Feed
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {SAMPLE_FOOD_LISTINGS.map((f) => {
              const isClaimed = claimedListings[f.id];
              return (
                <div
                  key={f.id}
                  className="bg-gray-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                        🍱 {f.servings} Meals
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isClaimed
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        {isClaimed ? "✓ In Transit" : "● Available"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-white">{f.donor}</h3>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">{f.items}</p>
                    </div>

                    <div className="p-3 bg-gray-900 rounded-xl text-xs space-y-1 text-gray-400 border border-white/5">
                      <div>📍 {f.address}</div>
                      <div>⏱️ Prepared: {f.prepared_at}</div>
                      <div className="text-amber-400 font-semibold">⏳ Freshness window: {f.safe_until}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(f.id, f.donor)}
                    disabled={isClaimed}
                    className={`w-full text-xs font-semibold py-2.5 rounded-xl transition-all ${
                      isClaimed
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                    }`}
                  >
                    {isClaimed ? "Claimed by Helping Hands" : "Claim & Route to Nearest Shelter"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volunteer Rapid Response Section */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Volunteer Squad Roster</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              { name: "Krishnapur Central Volunteers", count: 48, lead: "Ravi Shankar", status: "Active" },
              { name: "Ward 14 Flood Rescue Unit", count: 32, lead: "Pooja Varma", status: "Deployed" },
              { name: "Medical Logistics Team", count: 20, lead: "Dr. Sandeep", status: "Standby" },
              { name: "Youth Shelter Coordinators", count: 64, lead: "Arun Patel", status: "Active" },
            ].map((v) => (
              <div key={v.name} className="p-4 bg-gray-950 rounded-xl border border-white/5 space-y-1.5">
                <div className="font-bold text-white text-sm">{v.name}</div>
                <div className="text-emerald-400">{v.count} Volunteers Ready</div>
                <div className="text-gray-400">Team Lead: {v.lead}</div>
                <div className="pt-2 text-[10px] text-indigo-400 font-semibold">{v.status}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
