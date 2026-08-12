import Container from "@/components/ui/Container";

export default function ProductsLoading() {
  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-neutral-100" />
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-100" />
              <div className="h-8 w-64 animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
              <div className="h-16 w-full animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="h-48 w-full animate-pulse rounded-2xl bg-neutral-100" />
          </div>
        </div>
      </Container>
    </div>
  );
}
