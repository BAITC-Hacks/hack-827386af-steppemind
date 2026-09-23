import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function StudentProposalsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/business/proposals");
  return <Dashboard user={user} initialView="proposals" />;
}
