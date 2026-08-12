import Container from "@/components/ui/Container";

export default function CategoriesLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-neutral-50 py-8">
      <Container>
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="h-96 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="space-y-4 lg:col-span-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
