export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 bg-zinc-900 rounded-[22px]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-[440px] bg-zinc-900 rounded-[22px]" />
        <div className="lg:col-span-5 h-[440px] bg-zinc-900 rounded-[22px]" />
      </div>
      <div className="h-72 bg-zinc-900 rounded-[22px]" />
    </div>
  );
}
