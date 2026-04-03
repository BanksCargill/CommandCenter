"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Layers,
  Trash2,
  RotateCcw,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";

interface Stats {
  totalItems: number;
  dbSizeBytes: number;
  sources: { id: number; name: string; active: boolean; itemCount: number; lastFetchedAt: string | null }[];
}

interface Settings {
  fetch_interval_hours: string;
  digest_size: string;
  digest_default_on: string;
  retention_days: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

type SaveState = "idle" | "saving" | "saved" | "error";

function useSaveState(): [SaveState, () => void, () => void, () => void] {
  const [state, setState] = useState<SaveState>("idle");
  const setSaving = () => setState("saving");
  const setSaved = () => {
    setState("saved");
    setTimeout(() => setState("idle"), 2000);
  };
  const setError = () => {
    setState("error");
    setTimeout(() => setState("idle"), 3000);
  };
  return [state, setSaving, setSaved, setError];
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <Loader2 size={14} className="animate-spin text-gray-400" />;
  if (state === "saved") return <CheckCircle size={14} className="text-emerald-400" />;
  return <AlertCircle size={14} className="text-red-400" />;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    fetch_interval_hours: "3",
    digest_size: "5",
    digest_default_on: "true",
    retention_days: "30",
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [intervalSave, setIntervalSaving, setIntervalSaved, setIntervalError] = useSaveState();
  const [digestSizeSave, setDigestSizeSaving, setDigestSizeSaved, setDigestSizeError] = useSaveState();
  const [digestOnSave, setDigestOnSaving, setDigestOnSaved, setDigestOnError] = useSaveState();
  const [retentionSave, setRetentionSaving, setRetentionSaved, setRetentionError] = useSaveState();

  const [purging, setPurging] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/settings/stats");
      setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Settings) => setSettings(data));
    fetchStats();
  }, [fetchStats]);

  async function saveSetting(key: keyof Settings, value: string, onSaving: () => void, onSaved: () => void, onError: () => void) {
    onSaving();
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) onSaved(); else onError();
    } catch {
      onError();
    }
  }

  async function handlePurge() {
    setPurging(true);
    setPurgeMsg(null);
    try {
      const res = await fetch("/api/settings/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "retention", retentionDays: parseInt(settings.retention_days, 10) }),
      });
      const data = await res.json() as { deleted: number; message?: string };
      setPurgeMsg(data.message ?? `${data.deleted} item${data.deleted !== 1 ? "s" : ""} removed`);
      fetchStats();
    } finally {
      setPurging(false);
    }
  }

  async function handleClearAll() {
    if (!confirm("Delete all news items? This cannot be undone.")) return;
    setClearing(true);
    setPurgeMsg(null);
    try {
      const res = await fetch("/api/settings/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });
      const data = await res.json() as { deleted: number };
      setPurgeMsg(`All ${data.deleted} items cleared`);
      fetchStats();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
      <h1 className="text-lg font-semibold text-gray-100">Settings</h1>

      {/* ── Feed Behaviour ─────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Feed Behaviour</h2>

        {/* Fetch interval */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock size={14} className="text-gray-500 shrink-0" />
            <span>Fetch interval</span>
            <span className="text-gray-600 text-xs">(hours)</span>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={intervalSave} />
            <input
              type="number"
              min={1}
              max={24}
              value={settings.fetch_interval_hours}
              onChange={(e) => setSettings((s) => ({ ...s, fetch_interval_hours: e.target.value }))}
              onBlur={() =>
                saveSetting("fetch_interval_hours", settings.fetch_interval_hours, setIntervalSaving, setIntervalSaved, setIntervalError)
              }
              className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Digest size */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Layers size={14} className="text-gray-500 shrink-0" />
            <span>Digest size</span>
            <span className="text-gray-600 text-xs">(items per source)</span>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={digestSizeSave} />
            <input
              type="number"
              min={1}
              max={50}
              value={settings.digest_size}
              onChange={(e) => setSettings((s) => ({ ...s, digest_size: e.target.value }))}
              onBlur={() =>
                saveSetting("digest_size", settings.digest_size, setDigestSizeSaving, setDigestSizeSaved, setDigestSizeError)
              }
              className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Digest default on */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-300">Digest on by default</span>
            <span
              title={`When digest is on, the news feed shows only the top ${settings.digest_size} items per source (ranked by score where available). Turn it off to see everything unfiltered.`}
              className="text-gray-600 hover:text-gray-400 cursor-help transition-colors"
            >
              <Info size={12} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={digestOnSave} />
            <button
              onClick={() => {
                const next = settings.digest_default_on === "true" ? "false" : "true";
                setSettings((s) => ({ ...s, digest_default_on: next }));
                saveSetting("digest_default_on", next, setDigestOnSaving, setDigestOnSaved, setDigestOnError);
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings.digest_default_on === "true" ? "bg-emerald-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.digest_default_on === "true" ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── Data Hygiene ───────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Data Hygiene</h2>

        {/* Retention */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Keep items for</span>
            <span className="text-gray-600 text-xs">(days, 0 = forever)</span>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={retentionSave} />
            <input
              type="number"
              min={0}
              max={365}
              value={settings.retention_days}
              onChange={(e) => setSettings((s) => ({ ...s, retention_days: e.target.value }))}
              onBlur={() =>
                saveSetting("retention_days", settings.retention_days, setRetentionSaving, setRetentionSaved, setRetentionError)
              }
              className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handlePurge}
            disabled={purging || clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            {purging ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Purge old items now
          </button>
          <button
            onClick={handleClearAll}
            disabled={purging || clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-red-900 text-red-500 hover:text-red-300 hover:border-red-700 transition-colors disabled:opacity-50"
          >
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Clear all news
          </button>
          {purgeMsg && <span className="text-xs text-gray-500">{purgeMsg}</span>}
        </div>
      </section>

      {/* ── Database Stats ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Database Stats</h2>
          <button
            onClick={fetchStats}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loadingStats ? (
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <Database size={14} className="text-gray-500 shrink-0" />
              <span className="text-gray-400">
                <span className="text-gray-100 font-mono">{stats.totalItems.toLocaleString()}</span> total items
              </span>
              <span className="text-gray-600 text-xs font-mono ml-auto">{formatBytes(stats.dbSizeBytes)}</span>
            </div>

            <div className="rounded border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-3 py-2 text-left text-gray-500 font-normal">Source</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-normal">Items</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-normal">Last fetched</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sources.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-3 py-2 text-gray-300 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.active ? "bg-emerald-500" : "bg-gray-600"}`} />
                        {s.name}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{s.itemCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{formatDate(s.lastFetchedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600">Failed to load stats</div>
        )}
      </section>
    </div>
  );
}
