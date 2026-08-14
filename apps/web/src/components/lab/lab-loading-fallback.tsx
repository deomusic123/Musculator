export function LabLoadingFallback() {
  return (
    <div className="grid gap-4">
      <div className="h-28 animate-pulse rounded-[1.8rem] border border-white/8 bg-[#08111a]" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.8rem] border border-white/8 bg-[#08111a]" />
        <div className="h-64 animate-pulse rounded-[1.8rem] border border-white/8 bg-[#08111a]" />
      </div>
    </div>
  );
}
