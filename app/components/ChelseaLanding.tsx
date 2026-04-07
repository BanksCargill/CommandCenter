"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Layers, RefreshCw } from "lucide-react";
import type { ChelseaMatch, FeedSource } from "@/db/schema";
import { safeHref } from "@/lib/url-validator";
import ChelseaSchedule from "@/app/components/ChelseaSchedule";
import FeedSources from "@/app/components/FeedSources";
import PLStandings from "@/app/components/PLStandings";

type NewsItem = {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  score: number | null;
  publishedAt: Date | null;
  feedSourceId: number | null;
  sourceName: string | null;
  sourceTopicTags: string | null;
};

interface Props {
  initialNews: NewsItem[];
  chelseaNewsSources: FeedSource[];
  englandSources: FeedSource[];
  usaSources: FeedSource[];
  chelseaMatches: ChelseaMatch[];
  uclMatches: ChelseaMatch[];
  worldCupMatches: ChelseaMatch[];
  digestSize?: number;
  digestDefaultOn?: boolean;
}

type Tab = "chelsea" | "schedule" | "ucl" | "international" | "worldcup";
type IntlTab = "england" | "usa";

const TABS: { id: Tab; label: string }[] = [
  { id: "chelsea", label: "Chelsea News Feed" },
  { id: "schedule", label: "Schedule" },
  { id: "ucl", label: "Champions League" },
  { id: "international", label: "International" },
  { id: "worldcup", label: "World Cup" },
];

const PAGE_SIZE = 30;

function hasTag(topicTags: string | null | undefined, tag: string): boolean {
  return (topicTags ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .includes(tag);
}

function formatRelativeDate(d: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function applyDigest(items: NewsItem[], limit: number): NewsItem[] {
  const bySource = new Map<number, NewsItem[]>();
  for (const item of items) {
    const key = item.feedSourceId ?? 0;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(item);
  }
  const result: NewsItem[] = [];
  for (const group of bySource.values()) {
    const hasScores = group.some((i) => i.score != null);
    const ranked = hasScores
      ? [...group].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      : group;
    result.push(...ranked.slice(0, limit));
  }
  return result.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

function NewsItemRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={safeHref(item.url)}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-5 py-3 border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 group-hover:text-white leading-snug line-clamp-2">
            {item.title}
          </div>
          {item.summary && (
            <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.summary}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {item.sourceName && (
              <span className="text-xs text-gray-600">{item.sourceName}</span>
            )}
            <span className="text-xs text-gray-700">{formatRelativeDate(item.publishedAt)}</span>
            {item.score != null && item.score > 0 && (
              <span className="text-xs text-gray-600">{item.score} pts</span>
            )}
          </div>
        </div>
        <ExternalLink size={13} className="text-gray-700 group-hover:text-gray-500 shrink-0 mt-0.5" />
      </div>
    </a>
  );
}

interface NewsFeedPanelProps {
  items: NewsItem[];
  emptyTag: string;
  digestSize: number;
  digestDefaultOn: boolean;
}

function NewsFeedPanel({ items, emptyTag, digestSize, digestDefaultOn }: NewsFeedPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(digestDefaultOn);

  const tabSources = useMemo(() => {
    const seen = new Map<number, string>();
    for (const item of items) {
      if (item.feedSourceId != null && item.sourceName && !seen.has(item.feedSourceId)) {
        seen.set(item.feedSourceId, item.sourceName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const sourceFiltered = useMemo(
    () => selectedSource != null ? items.filter((i) => i.feedSourceId === selectedSource) : items,
    [items, selectedSource]
  );

  const all = useMemo(
    () => (digestEnabled ? applyDigest(sourceFiltered, digestSize) : sourceFiltered),
    [sourceFiltered, digestEnabled, digestSize]
  );

  const displayed = all.slice(0, visibleCount);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-600 text-sm">
        <span>No items yet.</span>
        <span className="text-xs text-gray-700">
          Add a feed source tagged &ldquo;{emptyTag}&rdquo; and refresh.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {tabSources.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-gray-800/60 shrink-0 bg-gray-950/50">
          <button
            onClick={() => { setSelectedSource(null); setVisibleCount(PAGE_SIZE); }}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              selectedSource === null
                ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            All
          </button>
          {tabSources.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSource(s.id); setVisibleCount(PAGE_SIZE); }}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                selectedSource === s.id
                  ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
            >
              {s.name}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setDigestEnabled((v) => !v)}
              title={digestEnabled ? "Show all articles" : `Show top ${digestSize} per source`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border ${
                digestEnabled
                  ? "bg-emerald-900/50 text-emerald-400 border-emerald-800"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              <Layers size={12} />
              Top {digestSize}
            </button>
            <span className="text-xs text-gray-700 font-mono">{displayed.length}/{all.length}</span>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {displayed.map((item) => (
          <NewsItemRow key={item.id} item={item} />
        ))}
        {all.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full py-3 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Load more ({all.length - visibleCount} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChelseaLanding({
  initialNews,
  chelseaNewsSources,
  englandSources,
  usaSources,
  chelseaMatches,
  uclMatches,
  worldCupMatches,
  digestSize = 5,
  digestDefaultOn = true,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("chelsea");
  const [intlTab, setIntlTab] = useState<IntlTab>("england");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/feeds/refresh", { method: "POST" });
      const data = await res.json();
      setRefreshMsg(`+${data.added ?? 0} new`);
      router.refresh();
    } catch {
      setRefreshMsg("error");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 4000);
    }
  }

  const chelseaNews = useMemo(
    () => initialNews.filter((item) =>
      (item.sourceTopicTags ?? "").split(",").map((t) => t.trim().toLowerCase()).includes("chelsea")
    ),
    [initialNews]
  );

  const englandNews = useMemo(
    () => initialNews.filter((item) => hasTag(item.sourceTopicTags, "england")),
    [initialNews]
  );

  const usaNews = useMemo(
    () => initialNews.filter((item) => hasTag(item.sourceTopicTags, "usa")),
    [initialNews]
  );

  // Determine which feed sources to show in the sidebar and whether to show it at all
  const showSources = tab !== "schedule" && tab !== "ucl" && tab !== "worldcup";
  const sourcesForTab: FeedSource[] =
    tab === "chelsea" ? chelseaNewsSources
    : tab === "international" && intlTab === "england" ? englandSources
    : tab === "international" ? usaSources
    : [];
  const defaultTagForTab =
    tab === "chelsea" ? "chelsea"
    : tab === "international" ? intlTab
    : "";
  // Key forces FeedSources to remount (reset local state) when the source list changes
  const sourcesKey = tab === "international" ? `intl-${intlTab}` : tab;

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Tab bar — full width */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-800 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              tab === t.id
                ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh all feeds"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-transparent text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshMsg ?? "Refresh"}
          </button>
        </div>
      </div>

      {/* Below tab bar: content + optional feed sources sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {tab === "chelsea" && (
            <NewsFeedPanel items={chelseaNews} emptyTag="chelsea" digestSize={digestSize} digestDefaultOn={digestDefaultOn} />
          )}

          {tab === "schedule" && (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <ChelseaSchedule initialMatches={chelseaMatches} team="chelsea" syncEnabled={true} />
              </div>
              <PLStandings />
            </div>
          )}

          {tab === "international" && (
            <div className="flex flex-col h-full min-h-0">
              {/* England / USA sub-tabs */}
              <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-800/60 shrink-0">
                {(["england", "usa"] as IntlTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setIntlTab(t)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      intlTab === t
                        ? "bg-amber-900/40 text-amber-400 border border-amber-800"
                        : "text-gray-400 hover:text-gray-200 border border-transparent"
                    }`}
                  >
                    {t === "england" ? "England" : "USA"}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {intlTab === "england" ? (
                  <NewsFeedPanel items={englandNews} emptyTag="england" digestSize={digestSize} digestDefaultOn={digestDefaultOn} />
                ) : (
                  <NewsFeedPanel items={usaNews} emptyTag="usa" digestSize={digestSize} digestDefaultOn={digestDefaultOn} />
                )}
              </div>
            </div>
          )}

          {tab === "ucl" && (
            <div className="flex-1 overflow-y-auto">
              <ChelseaSchedule initialMatches={uclMatches} team="ucl" syncEnabled={true} defaultCompetition="UEFA Champions League" />
            </div>
          )}

          {tab === "worldcup" && (
            <div className="flex-1 overflow-y-auto">
              <ChelseaSchedule initialMatches={worldCupMatches} team="world_cup" syncEnabled={true} defaultCompetition="FIFA World Cup" />
            </div>
          )}
        </div>

        {/* Feed sources sidebar — shown for news-type tabs */}
        {showSources && (
          <FeedSources
            key={sourcesKey}
            initialSources={sourcesForTab}
            defaultTags={defaultTagForTab}
          />
        )}
      </div>
    </div>
  );
}
