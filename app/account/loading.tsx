import Container from "@/components/ui/Container";

export default function AccountLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-neutral-50 py-8">
      <Container>
        <div className="mx-auto max-w-lg space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      </Container>
    </main>
  );
}
