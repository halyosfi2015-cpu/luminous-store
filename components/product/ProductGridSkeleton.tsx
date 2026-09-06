export default function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-label="جارٍ تحميل المنتجات"
      aria-busy="true"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-card border border-border bg-card p-3 shadow-card"
        >
          <div className="aspect-square w-full animate-pulse rounded-lg bg-muted-bg" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted-bg" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted-bg" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted-bg" />
          </div>
          <div className="mt-3 h-10 w-full animate-pulse rounded-button bg-muted-bg" />
        </div>
      ))}
    </div>
  );
}
