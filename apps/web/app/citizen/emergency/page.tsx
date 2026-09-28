"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";

const EMERGENCY_TYPES = [
  { id: "FLOOD", label: "Flood / Inundation", icon: "🌊", desc: "Waterlogging, submerged roads, trapped families" },
  { id: "FIRE", label: "Fire / Explosion", icon: "🔥", desc: "Building fire, cylinder blast, electrical blaze" },
  { id: "MEDICAL", label: "Mass Medical / Epidemic", icon: "🚑", desc: "Outbreak, poisoning, mass casualties" },
  { id: "COLLAPSE", label: "Structural Collapse", icon: "🏚️", desc: "Building, bridge, or wall collapse" },
  { id: "HAZARD", label: "Chemical / Electrical Hazard", icon: "⚡", desc: "High voltage wire fall, toxic leakage" },
];

export default function CitizenEmergencyPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("FLOOD");
  const [severity, setSeverity] = useState("CRITICAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [affectedCount, setAffectedCount] = useState<number>(5);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Acquiring GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        toast.success(`Location tagged: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => {
        toast.error("Unable to retrieve your location. Please enter address manually.");
      }
    );
  };

  const emergencyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/emergency", {
        title: title || `${selectedType} reported in ${address || "District Area"}`,
        description,
        type: selectedType,
        severity,
        latitude: coords?.lat ?? null,
        longitude: coords?.lon ?? null,
        address,
        affected_people_count: Number(affectedCount),
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`🚨 Emergency report filed: ${data.incident_id}`);
      router.push("/citizen/dashboard");
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message || "Failed to submit emergency report");
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* High Urgency Top Banner */}
      <div className="bg-red-600 text-white text-center py-2.5 px-4 text-sm font-bold tracking-wide animate-pulse">
        🚨 EMERGENCY RESPONSE DISPATCH — FOR IMMEDIATE LIFE-THREATENING DISPATCH DIAL 112 / 108
      </div>

      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/citizen/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Cancel &amp; Back
          </Link>
          <div className="text-sm font-bold text-red-400">SOS Incident Report</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Report an Emergency Incident</h1>
          <p className="text-gray-400 text-sm mt-1">
            This incident will be alerted directly to District Disaster Management Authority (DDMA), Fire, Police, and SDRF command.
          </p>
        </div>

        {/* Emergency Type Grid */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Select Emergency Category
          </label>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {EMERGENCY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  selectedType === t.id
                    ? "bg-red-950/70 border-red-500 shadow-lg shadow-red-500/20 text-white"
                    : "bg-gray-900 border-white/10 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="font-bold text-sm text-white">{t.label}</div>
                <div className="text-[11px] text-gray-400 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Incident Headline / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flood water rising rapidly in Ward 12, elderly trapped"
              className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Detailed Description &amp; Ground Situation *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact landmarks, water depth, number of people needing rescue, immediate danger..."
              className="w-full bg-gray-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="CRITICAL">🔴 CRITICAL (Active threat to life)</option>
                <option value="HIGH">🟠 HIGH (Severe damage / rising threat)</option>
                <option value="MEDIUM">🟡 MEDIUM (Localized containment needed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Estimated Affected People
              </label>
              <input
                type="number"
                min={0}
                value={affectedCount}
                onChange={(e) => setAffectedCount(Number(e.target.value))}
                className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-gray-300">
                Location &amp; Address *
              </label>
              <button
                type="button"
                onClick={detectLocation}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                📍 Detect Current GPS Location
              </button>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street name, landmark, colony, ward number..."
              className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
            {coords && (
              <div className="mt-2 text-xs text-emerald-400 font-mono">
                GPS Lat: {coords.lat.toFixed(5)}, Lon: {coords.lon.toFixed(5)} (Geo-tagged)
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/citizen/dashboard"
            className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => emergencyMutation.mutate()}
            disabled={emergencyMutation.isPending || !description || description.length < 10}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-xl shadow-red-600/30 flex items-center gap-2"
          >
            {emergencyMutation.isPending ? "Transmitting SOS..." : "🚨 Dispatch Emergency Alert"}
          </button>
        </div>
      </main>
    </div>
  );
}
