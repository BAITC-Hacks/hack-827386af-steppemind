import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function BusinessProposalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "business") redirect("/student/proposals");
  return <Dashboard user={user} initialView="proposals" />;
}
