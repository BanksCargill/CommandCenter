"use client";

import { useState } from "react";
import { RefreshCw, Plus, Check, X } from "lucide-react";
import type { ChelseaMatch } from "@/db/schema";

interface Props {
  initialMatches: ChelseaMatch[];
  team?: string;
  syncEnabled?: boolean;
  defaultCompetition?: string;
}

const RESULT_COLORS: Record<string, string> = {
  win: "text-emerald-400 bg-emerald-900/30 border-emerald-800",
  draw: "text-amber-400 bg-amber-900/30 border-amber-800",
  loss: "text-red-400 bg-red-900/30 border-red-800",
  upcoming: "text-gray-400 bg-gray-800/50 border-gray-700",
};

const VENUE_LABEL: Record<string, string> = {
  home: "H",
  away: "A",
  neutral: "N",
};

function formatDateOnly(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimeET(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function ChelseaSchedule({ initialMatches, team = "chelsea", syncEnabled = false, defaultCompetition = "Premier League" }: Props) {
  const [matches, setMatches] = useState(initialMatches);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editResult, setEditResult] = useState<"win" | "draw" | "loss" | "upcoming">("upcoming");

  // Add form state
  const [form, setForm] = useState({
    matchDate: "",
    opponent: "",
    competition: defaultCompetition,
    venue: "home" as "home" | "away" | "neutral",
    result: "upcoming" as "win" | "draw" | "loss" | "upcoming",
    score: "",
    notes: "",
  });

  const upcoming = matches
    .filter((m) => m.result === "upcoming")
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  const results = matches
    .filter((m) => m.result !== "upcoming")
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/chelsea/sync?team=${team}`, { method: "POST" });
      const data = await res.json();
      if (data.error === "no_api_key") {
        setSyncMsg("No API key — add football_api_key in Settings.");
      } else if (data.error) {
        setSyncMsg(`Sync error: ${data.error}`);
      } else {
        setSyncMsg(`+${data.added} added, ${data.updated} updated`);
        const matchRes = await fetch(`/api/chelsea/matches?team=${team}`);
        setMatches(await matchRes.json());
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!form.matchDate || !form.opponent || !form.competition) return;
    const res = await fetch("/api/chelsea/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        team,
        score: form.score || null,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setMatches((prev) => [...prev, created]);
      setForm({ matchDate: "", opponent: "", competition: defaultCompetition, venue: "home", result: "upcoming", score: "", notes: "" });
      setShowAdd(false);
    }
  }

  async function handleSaveEdit(id: number) {
    const res = await fetch(`/api/chelsea/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: editResult, score: editScore || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMatches((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/chelsea/matches/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMatches((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function startEdit(match: ChelseaMatch) {
    setEditingId(match.id);
    setEditScore(match.score ?? "");
    setEditResult(match.result);
  }

  function MatchRow({ match }: { match: ChelseaMatch }) {
    const isEditing = editingId === match.id;
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 hover:bg-gray-900/40 group">
        {/* Date + time */}
        <div className="w-36 shrink-0">
          <div className="text-xs text-gray-500 font-mono">{formatDateOnly(match.matchDate)}</div>
          <div className="text-xs text-gray-700 font-mono">{formatTimeET(match.matchDate)}</div>
        </div>
        {/* Venue badge */}
        <div className="w-5 shrink-0 text-xs text-gray-600 font-bold">{VENUE_LABEL[match.venue]}</div>
        {/* Opponent + competition */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 truncate">{match.opponent}</div>
          <div className="text-xs text-gray-600 truncate">{match.competition}</div>
        </div>
        {/* Result / score */}
        {isEditing ? (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={editResult}
              onChange={(e) => setEditResult(e.target.value as typeof editResult)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
            >
              <option value="upcoming">Upcoming</option>
              <option value="win">Win</option>
              <option value="draw">Draw</option>
              <option value="loss">Loss</option>
            </select>
            <input
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              placeholder="2-1"
              className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
            />
            <button onClick={() => handleSaveEdit(match.id)} className="text-emerald-400 hover:text-emerald-300">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => startEdit(match)}
              className={`px-2 py-0.5 rounded border text-xs font-mono ${RESULT_COLORS[match.result]}`}
            >
              {match.score ?? match.result.charAt(0).toUpperCase() + match.result.slice(1)}
            </button>
            <button
              onClick={() => handleDelete(match.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        {syncEnabled && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync fixtures"}
          </button>
        )}
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
        >
          <Plus size={12} />
          Add match
        </button>
        {syncMsg && <span className="text-xs text-gray-500">{syncMsg}</span>}
      </div>

      {/* Add match form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Date</label>
            <input
              type="datetime-local"
              value={form.matchDate}
              onChange={(e) => setForm((f) => ({ ...f, matchDate: e.target.value }))}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Opponent</label>
            <input
              value={form.opponent}
              onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
              placeholder="Arsenal"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Competition</label>
            <input
              value={form.competition}
              onChange={(e) => setForm((f) => ({ ...f, competition: e.target.value }))}
              placeholder="Premier League"
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Venue</label>
            <select
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value as typeof form.venue }))}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded text-xs bg-emerald-900/50 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upcoming fixtures */}
      <div>
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800 bg-gray-950">
          Upcoming ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <div className="px-4 py-6 text-xs text-gray-600 text-center">
            No upcoming fixtures.{syncEnabled ? " Sync to pull from football-data.org." : " Add one above."}
          </div>
        ) : (
          upcoming.map((m) => <MatchRow key={m.id} match={m} />)
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-2">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800 bg-gray-950">
            Results ({results.length})
          </div>
          {results.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
