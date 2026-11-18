export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-zinc-900 rounded-xl w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
        <div className="hidden lg:block h-72 bg-zinc-900/60 rounded-2xl" />
        <div className="h-[560px] bg-zinc-900/60 rounded-2xl" />
      </div>
    </div>
  );
}
