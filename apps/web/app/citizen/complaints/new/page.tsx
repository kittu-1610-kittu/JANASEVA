"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";

const CATEGORIES = [
  { code: "POTHOLE", label: "🕳️ Pothole", dept: "Roads" },
  { code: "ROAD_DAMAGE", label: "🚧 Road Damage", dept: "Roads" },
  { code: "WATER_LEAK", label: "💧 Water Leakage", dept: "Water" },
  { code: "WATER_SUPPLY", label: "🚰 Water Supply Failure", dept: "Water" },
  { code: "DRAINAGE", label: "🔽 Drainage Blockage", dept: "Water" },
  { code: "GARBAGE", label: "🗑️ Garbage Not Collected", dept: "Sanitation" },
  { code: "STREETLIGHT", label: "💡 Street Light Out", dept: "Electricity" },
  { code: "MANHOLE", label: "🔵 Open Manhole", dept: "Water" },
  { code: "STRAY_ANIMAL", label: "🐕 Stray Animal Menace", dept: "Animal Husbandry" },
  { code: "ILLEGAL_CONST", label: "🏗️ Illegal Construction", dept: "Town Planning" },
  { code: "TREE_FALL", label: "🌳 Tree Fall", dept: "Roads" },
  { code: "FIRE", label: "🔥 Fire Hazard", dept: "Fire & Emergency" },
  { code: "FLOOD", label: "🌊 Flood", dept: "Emergency" },
  { code: "MEDICAL", label: "🏥 Medical Emergency", dept: "Health" },
  { code: "SAFETY", label: "🚨 Safety Threat", dept: "Police" },
];

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(300),
  description: z.string().min(10, "Please provide more detail").max(5000),
  category_code: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
  is_emergency: z.boolean().default(false),
  is_anonymous: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

export default function NewComplaintPage() {
  const router = useRouter();
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: string; confidence: number; summary: string
  } | null>(null);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const description = watch("description");
  const selectedCategory = watch("category_code");
  const isEmergency = watch("is_emergency");

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude);
        setValue("longitude", pos.coords.longitude);
        setLocationSet(true);
        setLocationLoading(false);
        toast.success("Location captured successfully.");
      },
      () => {
        toast.error("Unable to get your location. You can proceed without it.");
        setLocationLoading(false);
      }
    );
  }, [setValue]);

  const getAiSuggestion = useCallback(async () => {
    if (!description || description.length < 20) return;
    try {
      const res = await api.post("/ai/classify", { text: description });
      setAiSuggestion(res.data);
      toast.info(`AI suggests: ${res.data.category} (${Math.round(res.data.confidence * 100)}% confidence)`);
    } catch {
      // AI suggestion is optional — fail silently
    }
  }, [description]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, any> = {
        title: data.title,
        description: data.description,
        category_code: data.category_code,
        is_emergency: data.is_emergency,
        is_anonymous: data.is_anonymous,
      };
      if (data.latitude && data.longitude) {
        payload.location = {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
        };
      }
      const res = await api.post("/complaints", payload);
      return res.data;
    },
    onSuccess: (complaint) => {
      toast.success(`Complaint ${complaint.complaint_id} submitted successfully!`);
      router.push(`/citizen/complaints/${complaint.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.apiError?.message ?? "Failed to submit complaint. Please try again.");
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/citizen/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <span className="font-semibold text-sm">Report an Issue</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Emergency Banner */}
        {isEmergency && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 animate-fade-in">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="font-semibold text-red-300">Emergency Complaint</div>
              <div className="text-xs text-red-400">This will be treated as a priority incident.</div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-6">New Complaint</h1>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Issue Title <span className="text-red-400">*</span>
              </label>
              <input
                {...register("title")}
                placeholder="e.g., Large pothole on MG Road near Bus Stop"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register("description")}
                rows={4}
                placeholder="Describe the issue in detail — location, duration, impact on residents..."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
              )}
              {description && description.length >= 20 && (
                <button
                  type="button"
                  onClick={getAiSuggestion}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  🤖 Get AI category suggestion
                </button>
              )}
            </div>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl animate-fade-in">
                <div className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                  🤖 AI Suggestion
                  <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-xs">
                    {Math.round(aiSuggestion.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-3">{aiSuggestion.summary}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("category_code", aiSuggestion.category)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✓ Accept: {aiSuggestion.category}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => setValue("category_code", cat.code)}
                    className={`text-left px-3 py-2 rounded-xl text-xs border transition-all ${
                      selectedCategory === cat.code
                        ? "bg-indigo-900/50 border-indigo-500 text-indigo-300"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500/50"
                    }`}
                  >
                    <div className="font-medium">{cat.label}</div>
                    <div className="text-gray-500 mt-0.5">{cat.dept}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm border transition-all ${
                    locationSet
                      ? "bg-green-900/30 border-green-500/50 text-green-300"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500/50"
                  }`}
                >
                  {locationLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      Getting location...
                    </>
                  ) : locationSet ? (
                    <>✓ Location captured</>
                  ) : (
                    <>📍 Use my current location</>
                  )}
                </button>
              </div>
              <input
                {...register("address")}
                placeholder="Or type the address manually..."
                className="mt-2 w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Flags */}
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register("is_emergency")}
                  className="w-4 h-4 rounded accent-red-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    🚨 This is an emergency
                  </span>
                  <div className="text-xs text-gray-500">Urgent attention needed</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register("is_anonymous")}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    🕶️ Submit anonymously
                  </span>
                  <div className="text-xs text-gray-500">Your identity will be hidden</div>
                </div>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all text-sm"
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Your complaint will be reviewed and assigned to the appropriate department.
          You will receive status updates via notifications.
        </p>
      </main>
    </div>
  );
}
