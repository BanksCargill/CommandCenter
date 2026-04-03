// Doc detail skeleton — shown instantly while server component renders
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-4 w-4 bg-gray-800 rounded shrink-0" />
        <div className="h-6 bg-gray-800 rounded w-64" />
      </div>
      {/* Tags row */}
      <div className="flex gap-2 mb-6">
        <div className="h-5 bg-gray-800 rounded w-20" />
        <div className="h-5 bg-gray-800 rounded w-16" />
      </div>
      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-800 rounded"
            style={{ width: `${i % 3 === 2 ? 55 : i % 2 === 0 ? 100 : 85}%` }}
          />
        ))}
      </div>
    </div>
  );
}
