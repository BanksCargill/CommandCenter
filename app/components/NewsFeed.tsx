"use client";

import { useState } from "react";
import { ExternalLink, Layers } from "lucide-react";
import type { FeedSource, NewsItem } from "@/db/schema";

function formatScore(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

type NewsItemWithSource = NewsItem & { sourceName: string | null };

interface Props {
  initialItems: NewsItemWithSource[];
  sources: FeedSource[];
  digestSize?: number;
  digestDefaultOn?: boolean;
}

const PAGE_SIZE = 50;

function applyDigest(items: NewsItemWithSource[], limit: number): NewsItemWithSource[] {
  // Group by source
  const bySource = new Map<number, NewsItemWithSource[]>();
  for (const item of items) {
    const key = item.feedSourceId ?? 0;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(item);
  }

  const result: NewsItemWithSource[] = [];
  for (const group of bySource.values()) {
    // If the source has scores, rank by score; otherwise keep date order (already sorted)
    const hasScores = group.some((i) => i.score != null);
    const ranked = hasScores
      ? [...group].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      : group;
    result.push(...ranked.slice(0, limit));
  }

  // Re-sort the merged result by date descending
  return result.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

export default function NewsFeed({ initialItems, sources, digestSize = 5, digestDefaultOn = true }: Props) {
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [digest, setDigest] = useState(digestDefaultOn);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function selectSource(id: number | null) {
    setSelectedSource(id);
    setVisibleCount(PAGE_SIZE);
  }

  const sourceFiltered = selectedSource
    ? initialItems.filter((i) => i.feedSourceId === selectedSource)
    : initialItems;

  const all = digest ? applyDigest(sourceFiltered, digestSize) : sourceFiltered;
  const displayed = all.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full flex-1 min-w-0">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-800 shrink-0">
        <button
          onClick={() => selectSource(null)}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            selectedSource === null
              ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
              : "text-gray-400 hover:text-gray-200 border border-transparent"
          }`}
        >
          All
        </button>
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSource(s.id)}
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
            onClick={() => setDigest((v) => !v)}
            title={digest ? "Show all articles" : `Show top ${digestSize} per source`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border ${
              digest
                ? "bg-emerald-900/50 text-emerald-400 border-emerald-800"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            <Layers size={12} />
            Top {digestSize}
          </button>
          <span className="text-gray-600 text-xs font-mono">{displayed.length}/{all.length} items</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto divide-y divide-gray-800/50 flex flex-col">
        {displayed.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-600 text-sm">
            No articles yet. Hit Refresh to fetch from your feeds.
          </div>
        ) : (
          displayed.map((item) => (
            <article key={item.id} className="px-5 py-4 hover:bg-gray-900/40 group">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white font-medium leading-snug hover:text-emerald-300 transition-colors line-clamp-2"
                >
                  {item.title}
                </a>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-300 shrink-0 mt-0.5"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
              {item.summary && (
                <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                {item.sourceName && (
                  <span className="text-xs text-emerald-700">{item.sourceName}</span>
                )}
                {item.score != null && (
                  <span className="text-xs text-amber-500 font-mono tabular-nums">
                    ▲ {formatScore(item.score)}
                  </span>
                )}
                {item.publishedAt && (
                  <span className="text-xs text-gray-600 font-mono">
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
        {visibleCount < all.length && (
          <div className="px-5 py-4 shrink-0">
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Load more ({all.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
