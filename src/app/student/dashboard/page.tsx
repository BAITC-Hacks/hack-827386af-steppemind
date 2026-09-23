import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/business/dashboard");
  return <Dashboard user={user} initialView="dashboard" />;
}
