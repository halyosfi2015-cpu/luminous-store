import { redirect } from "next/navigation";

// PART 2 / P0: /admin/content was an empty directory (404).
// The canonical Content Center lives at /admin/ai/content — redirect there.
export default function AdminContentRedirect() {
  redirect("/admin/ai/content");
}
