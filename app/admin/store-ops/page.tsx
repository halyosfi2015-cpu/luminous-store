import { Suspense } from "react";
import StoreOpsCenter from "@/components/admin/store-ops/StoreOpsCenter";

export default function StoreOpsPage() {
  return (
    <Suspense fallback={null}>
      <StoreOpsCenter />
    </Suspense>
  );
}
