"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import type { FeedSource } from "@/db/schema";

interface Props {
  initialSources: FeedSource[];
  defaultTags?: string;
}

export default function FeedSources({ initialSources, defaultTags = "" }: Props) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", topicTags: defaultTags });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/feeds/refresh", { method: "POST" });
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleSource(id: number) {
    const res = await fetch(`/api/feeds/${id}`, { method: "PATCH", body: JSON.stringify({}) });
    const updated = await res.json();
    setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  async function deleteSource(id: number) {
    await fetch(`/api/feeds/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) return;
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "rss" }),
    });
    const created = await res.json();
    setSources((prev) => [...prev, created]);
    setForm({ name: "", url: "", topicTags: defaultTags });
    setAdding(false);
  }

  return (
    <div className="w-72 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider flex-1">
          Feed Sources
        </span>
        {lastRefreshed && (
          <span className="text-gray-600 text-xs font-mono">{lastRefreshed}</span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh all feeds"
          className="text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-gray-500 hover:text-emerald-400 transition-colors"
          title="Add feed"
        >
          <Plus size={15} />
        </button>
      </div>

      {adding && (
        <form onSubmit={addSource} className="px-4 py-3 border-b border-gray-800 flex flex-col gap-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          <input
            placeholder="RSS URL"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          <input
            placeholder="Topics (comma-separated)"
            value={form.topicTags}
            onChange={(e) => setForm((f) => ({ ...f, topicTags: e.target.value }))}
            className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs rounded py-1.5 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-auto divide-y divide-gray-800/50">
        {sources.map((s) => (
          <div key={s.id} className="flex items-start gap-3 px-4 py-3 group">
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${s.active ? "text-gray-200" : "text-gray-600"}`}>
                {s.name}
              </p>
              {s.topicTags && (
                <p className="text-xs text-gray-600 mt-0.5 truncate">{s.topicTags}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => toggleSource(s.id)}
                className={`transition-colors ${s.active ? "text-emerald-500 hover:text-emerald-300" : "text-gray-600 hover:text-gray-400"}`}
                title={s.active ? "Disable" : "Enable"}
              >
                {s.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              </button>
              <button
                onClick={() => deleteSource(s.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
