import Container from "@/components/ui/Container";

export default function CartLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-neutral-50 py-8">
      <Container>
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-24 w-24 animate-pulse rounded-xl bg-neutral-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                      <div className="h-3 w-48 animate-pulse rounded bg-neutral-200" />
                      <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-200" />
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}