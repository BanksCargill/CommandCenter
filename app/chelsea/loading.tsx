export default function ChelseaLoading() {
  return (
    <div className="flex flex-col h-full flex-1 min-w-0 animate-pulse">
      {/* Tab bar skeleton */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 shrink-0">
        {[80, 88, 76, 104].map((w, i) => (
          <div key={i} className="h-6 rounded bg-gray-800" style={{ width: w }} />
        ))}
      </div>
      {/* News item rows */}
      <div className="flex flex-col divide-y divide-gray-800/50">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3.5 bg-gray-800 rounded w-3/4" />
              <div className="h-3 bg-gray-800/60 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
