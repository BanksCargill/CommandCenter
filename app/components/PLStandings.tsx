"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { CHELSEA_TEAM_ID } from "@/lib/football-fetcher";

interface StandingRow {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export default function PLStandings() {
  const [table, setTable] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStandings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chelsea/standings");
      if (res.status === 403) {
        setError("no_api_key");
        return;
      }
      if (!res.ok) {
        setError("fetch_failed");
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTable(data);
      }
    } catch {
      setError("fetch_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStandings(); }, []);

  return (
    <div className="w-72 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider flex-1">
          Premier League
        </span>
        <button
          onClick={fetchStandings}
          disabled={loading}
          title="Refresh standings"
          className="text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && table.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-600">Loading standings…</div>
        ) : error === "no_api_key" ? (
          <div className="px-4 py-8 text-center text-xs text-gray-600">
            Add <span className="font-mono text-gray-500">football_api_key</span> in Settings to view standings.
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-xs text-gray-600">Failed to load standings.</div>
        ) : table.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-600">No data.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 sticky top-0 bg-gray-950">
                <th className="px-2 py-1.5 text-right text-gray-600 font-normal w-6">#</th>
                <th className="px-2 py-1.5 text-left text-gray-600 font-normal">Club</th>
                <th className="px-1 py-1.5 text-right text-gray-600 font-normal w-6" title="Played">P</th>
                <th className="px-1 py-1.5 text-right text-gray-600 font-normal w-6" title="Won">W</th>
                <th className="px-1 py-1.5 text-right text-gray-600 font-normal w-6" title="Drawn">D</th>
                <th className="px-1 py-1.5 text-right text-gray-600 font-normal w-6" title="Lost">L</th>
                <th className="px-1 py-1.5 text-right text-gray-600 font-normal w-8" title="Goal Difference">GD</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-semibold w-8" title="Points">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const isChelsea = row.team.id === CHELSEA_TEAM_ID;
                return (
                  <tr
                    key={row.team.id}
                    className={`border-b border-gray-800/40 ${
                      isChelsea
                        ? "bg-blue-950/40 border-blue-900/40"
                        : "hover:bg-gray-900/30"
                    }`}
                  >
                    <td className={`px-2 py-1.5 text-right font-mono ${isChelsea ? "text-blue-400" : "text-gray-600"}`}>
                      {row.position}
                    </td>
                    <td className={`px-2 py-1.5 truncate max-w-0 ${isChelsea ? "text-blue-300 font-medium" : "text-gray-300"}`}
                        style={{ maxWidth: "8rem" }}
                        title={row.team.name}
                    >
                      {row.team.shortName || row.team.name}
                    </td>
                    <td className="px-1 py-1.5 text-right font-mono text-gray-500">{row.playedGames}</td>
                    <td className="px-1 py-1.5 text-right font-mono text-gray-500">{row.won}</td>
                    <td className="px-1 py-1.5 text-right font-mono text-gray-500">{row.draw}</td>
                    <td className="px-1 py-1.5 text-right font-mono text-gray-500">{row.lost}</td>
                    <td className={`px-1 py-1.5 text-right font-mono ${row.goalDifference > 0 ? "text-emerald-600" : row.goalDifference < 0 ? "text-red-700" : "text-gray-600"}`}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono font-semibold ${isChelsea ? "text-blue-300" : "text-gray-200"}`}>
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
