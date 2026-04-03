// Docs list skeleton — shown instantly while server component renders
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-gray-800 rounded w-16" />
        <div className="h-7 bg-gray-800 rounded w-24" />
      </div>
      {/* Search bar */}
      <div className="h-8 bg-gray-900 border border-gray-800 rounded-lg w-full mb-4" />
      {/* Doc rows */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-800/60">
          <div className="h-4 w-4 bg-gray-800 rounded shrink-0" />
          <div className="h-4 bg-gray-800 rounded flex-1" style={{ width: `${60 + (i % 3) * 15}%` }} />
          <div className="h-3 bg-gray-800 rounded w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
