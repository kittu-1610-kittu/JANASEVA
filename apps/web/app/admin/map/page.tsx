"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";

interface ComplaintMarker {
  id: string;
  complaint_id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  lat: number;
  lon: number;
  is_emergency: boolean;
  sla_breached: boolean;
}

interface ResourceMarker {
  id: string;
  name: string;
  type: string;
  status: string;
  lat: number;
  lon: number;
  capacity: number | null;
  available: number | null;
  address: string | null;
}

export default function GISMapPage() {
  const [filterLayer, setFilterLayer] = useState<"ALL" | "EMERGENCY" | "SHELTER" | "HOSPITAL">("ALL");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ["map", "complaints"],
    queryFn: async () => {
      const res = await api.get("/map/complaints", { params: { limit: 150 } });
      return res.data as ComplaintMarker[];
    },
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["map", "resources"],
    queryFn: async () => {
      const res = await api.get("/map/resources");
      return res.data as ResourceMarker[];
    },
  });

  const items = complaints ?? [];
  const resItems = resources ?? [];

  // Project geographic coordinates to 0-100% relative canvas
  // Krishnapur demo district bounding box approx: lat [17.30, 17.50], lon [78.35, 78.60]
  const minLat = 17.30;
  const maxLat = 17.50;
  const minLon = 78.35;
  const maxLon = 78.60;

  const projectCoords = (lat: number, lon: number) => {
    const x = Math.min(Math.max(((lon - minLon) / (maxLon - minLon)) * 100, 5), 95);
    const y = Math.min(Math.max((1 - (lat - minLat) / (maxLat - minLat)) * 100, 5), 95);
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-gray-950/90 backdrop-blur-md px-6 h-16 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <span className="font-bold text-sm">Krishnapur GIS District Command Map</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-950 border border-indigo-800/40 text-indigo-300 px-3 py-1 rounded-full font-mono">
            {items.length} Incidents | {resItems.length} Key Facilities
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Map Canvas */}
        <div className="flex-1 relative bg-[#090d16] overflow-hidden flex items-center justify-center p-4">
          {/* Spatial Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

          {/* District Boundary Simulation */}
          <div className="relative w-full h-[650px] max-w-5xl border border-indigo-500/20 rounded-3xl bg-indigo-950/10 backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Compass / Scale */}
            <div className="absolute top-4 left-4 z-20 bg-gray-900/90 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-gray-400 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live District Telemetry
              </div>
              <div>Bounding: 17.38°N, 78.48°E</div>
            </div>

            {/* Layer Filter Buttons */}
            <div className="absolute top-4 right-4 z-20 flex gap-1.5 bg-gray-900/90 border border-white/10 p-1 rounded-xl">
              {[
                { id: "ALL", label: "All Layers" },
                { id: "EMERGENCY", label: "🚨 Critical / SOS" },
                { id: "SHELTER", label: "🏕️ Shelters" },
                { id: "HOSPITAL", label: "🏥 Hospitals" },
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setFilterLayer(layer.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterLayer === layer.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* SVG Interactive GIS Overlay */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              {/* Synthetic Ward Boundaries */}
              <path
                d="M 120 180 Q 300 120 480 200 T 800 240 L 750 480 Q 500 550 300 450 Z"
                fill="rgba(99, 102, 241, 0.03)"
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 280 200 Q 520 280 720 220 L 680 400 Q 420 420 280 340 Z"
                fill="rgba(16, 185, 129, 0.02)"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth="1.5"
              />
            </svg>

            {/* Complaint Pins */}
            {items
              .filter((c) => {
                if (filterLayer === "EMERGENCY") return c.is_emergency || c.priority === "CRITICAL";
                if (filterLayer === "SHELTER" || filterLayer === "HOSPITAL") return false;
                return true;
              })
              .map((c) => {
                const { x, y } = projectCoords(c.lat, c.lon);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedItem({ type: "COMPLAINT", data: c })}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-all hover:scale-150 z-10 ${
                      c.is_emergency
                        ? "bg-red-500 ring-4 ring-red-500/30 animate-pulse shadow-lg shadow-red-500/50"
                        : c.priority === "CRITICAL"
                        ? "bg-orange-500 ring-2 ring-orange-500/30"
                        : "bg-indigo-500 ring-2 ring-indigo-500/20"
                    }`}
                    title={c.title}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </button>
                );
              })}

            {/* Resource Facility Pins */}
            {resItems
              .filter((r) => {
                if (filterLayer === "EMERGENCY") return false;
                if (filterLayer === "SHELTER") return r.type === "SHELTER";
                if (filterLayer === "HOSPITAL") return r.type === "HOSPITAL";
                return true;
              })
              .map((r) => {
                const { x, y } = projectCoords(r.lat, r.lon);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedItem({ type: "RESOURCE", data: r })}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-sm z-10 p-1 bg-gray-900/90 rounded-lg border border-white/20 shadow-lg hover:scale-125 transition-transform"
                    title={r.name}
                  >
                    {r.type === "HOSPITAL" ? "🏥" : r.type === "SHELTER" ? "🏕️" : "🏢"}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Sidebar Detail Drawer */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-gray-900/95 p-6 flex flex-col justify-between overflow-y-auto">
          {selectedItem ? (
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                  {selectedItem.type === "COMPLAINT"
                    ? selectedItem.data.complaint_id
                    : selectedItem.data.type}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ✕ Close
                </button>
              </div>

              {selectedItem.type === "COMPLAINT" ? (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedItem.data.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                        Status: {selectedItem.data.status}
                      </span>
                      <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded font-bold">
                        {selectedItem.data.priority}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-950 rounded-xl border border-white/5 text-xs space-y-1.5">
                    <div className="text-gray-400">
                      Coordinates: {selectedItem.data.lat.toFixed(4)}, {selectedItem.data.lon.toFixed(4)}
                    </div>
                    {selectedItem.data.is_emergency && (
                      <div className="text-red-400 font-bold">🚨 Marked as Emergency Incident</div>
                    )}
                    {selectedItem.data.sla_breached && (
                      <div className="text-orange-400 font-bold">⏰ SLA Breached</div>
                    )}
                  </div>

                  <Link
                    href={`/citizen/complaints/${selectedItem.data.id}`}
                    className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
                  >
                    Open Ticket Detail Page →
                  </Link>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedItem.data.name}</h3>
                    <div className="text-xs text-emerald-400 mt-1">Status: {selectedItem.data.status}</div>
                  </div>

                  <div className="p-3 bg-gray-950 rounded-xl border border-white/5 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Capacity:</span>
                      <span className="text-white font-bold">{selectedItem.data.capacity ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available Space:</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedItem.data.available ?? selectedItem.data.capacity ?? "Open"}
                      </span>
                    </div>
                    {selectedItem.data.address && (
                      <div className="text-gray-400 pt-1 border-t border-white/5">
                        📍 {selectedItem.data.address}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-white">District GIS Overview</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Click on any map node to inspect real-time incidents, shelter availability, or hospital bed capacity.
              </p>

              <div className="p-4 bg-gray-950 rounded-xl border border-white/5 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-gray-300">Critical / Emergency Incident</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-gray-300">Public Service Complaint</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🏥</span>
                  <span className="text-gray-300">District Hospital / Trauma Center</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🏕️</span>
                  <span className="text-gray-300">Evacuation Shelter / Community Hall</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 text-[11px] text-gray-500 text-center">
            JANASEVA GIS Spatial Engine • Krishnapur District
          </div>
        </div>
      </div>
    </div>
  );
}
