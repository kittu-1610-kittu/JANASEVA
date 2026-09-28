"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  tool_used?: string | null;
}

const PRESET_QUERIES = [
  "Show unresolved water complaints older than 48 hours",
  "Summarize active emergency incidents across Krishnapur",
  "What is the current shelter occupancy in flood prone wards?",
  "List SLA breached complaints in the Roads department",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am the JANASEVA AI Command Assistant. I query live district data using authorized read-only analytics tools. How can I assist district administration today?",
    },
  ]);
  const [input, setInput] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await api.post("/ai/chat", { message: messageText });
      return res.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          sources: data.sources,
          tool_used: data.tool_used,
        },
      ]);
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.apiError?.message ||
            "Unable to execute command query. Please try another query.",
        },
      ]);
    },
  });

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    chatMutation.mutate(text);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-md px-6 h-16 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="font-bold text-sm">AI Command &amp; Analytics Assistant</span>
          </div>
        </div>

        <div className="text-xs bg-indigo-950 border border-indigo-800/40 text-indigo-300 px-3 py-1 rounded-full">
          Controlled Analytics API (No Unrestricted DB Access)
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-between overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-sm ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm shrink-0 shadow-md">
                  🤖
                </div>
              )}
              <div
                className={`p-4 rounded-2xl max-w-xl ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20"
                    : "bg-gray-900 border border-white/10 text-gray-200 rounded-tl-none shadow-xl"
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed">{m.content}</div>

                {m.tool_used && (
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-mono text-indigo-300">
                    <span>⚡ Executed tool:</span>
                    <span className="bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40 font-bold">
                      {m.tool_used}()
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm shrink-0 animate-pulse">
                🤖
              </div>
              <div className="p-4 rounded-2xl bg-gray-900 border border-white/10 text-gray-400 text-xs italic">
                Executing authorized analytics tool &amp; compiling response...
              </div>
            </div>
          )}
        </div>

        {/* Preset Buttons & Input Box */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={chatMutation.isPending}
                className="text-xs bg-gray-900 border border-white/10 hover:border-indigo-500/40 hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-xl transition-all"
              >
                💡 {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask natural language command (e.g. show unresolved flood reports)..."
              disabled={chatMutation.isPending}
              className="flex-1 bg-gray-900 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 shadow-xl"
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
