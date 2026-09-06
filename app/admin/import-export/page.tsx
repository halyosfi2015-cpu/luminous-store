import type { Metadata } from "next";
import BulkImportExportAdmin from "@/components/admin/ImportExport/BulkImportExportAdmin";

export const metadata: Metadata = {
  title: "",
};

export default function AdminImportExportPage() {
  return <BulkImportExportAdmin />;
}
