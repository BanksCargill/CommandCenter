// News Feed skeleton — shown instantly while server component renders
export default function Loading() {
  return (
    <div className="flex h-full">
      {/* Feed items */}
      <div className="flex-1 p-4 overflow-auto space-y-2 animate-pulse">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2">
            <div className="h-4 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/3" />
          </div>
        ))}
      </div>
      {/* Sources sidebar */}
      <div className="w-56 border-l border-gray-800 p-4 shrink-0 animate-pulse space-y-2">
        <div className="h-4 bg-gray-800 rounded w-20 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-900 border border-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}
