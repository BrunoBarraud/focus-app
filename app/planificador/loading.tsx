export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-zinc-900 rounded-lg w-1/4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 h-96 bg-zinc-900 rounded-2xl shrink-0" />
        ))}
      </div>
    </div>
  );
}
