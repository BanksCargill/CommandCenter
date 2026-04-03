// Settings skeleton — shown instantly while client component bootstraps
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-8" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-6 space-y-2">
          <div className="h-4 bg-gray-800 rounded w-40" />
          <div className="h-9 bg-gray-900 border border-gray-800 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
