import type { Metadata } from "next";
import ConsultationsAdmin from "@/components/admin/ConsultationsAdmin";

export const metadata: Metadata = {
  title: "الاستشارات والطلبات - Luminous Admin",
};

export default function AdminConsultationsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <ConsultationsAdmin />
    </div>
  );
}
