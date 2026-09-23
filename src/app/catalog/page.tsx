import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function CatalogPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Dashboard user={user} initialView="catalog" />;
}
