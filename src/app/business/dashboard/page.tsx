import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function BusinessDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "business") redirect("/student/dashboard");
  return <Dashboard user={user} initialView="dashboard" />;
}
