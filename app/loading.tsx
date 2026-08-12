export default function Loading() {
  return (
    <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-purple-600" />
        <p className="text-sm text-neutral-400">جاري التحميل...</p>
      </div>
    </main>
  );
}
