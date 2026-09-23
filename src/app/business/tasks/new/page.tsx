import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export default async function NewBusinessTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "business") redirect("/student/dashboard");
  const rawTaskId = (await searchParams).task;
  const taskId = typeof rawTaskId === "string" && /^\d+$/.test(rawTaskId) ? Number(rawTaskId) : undefined;
  return <Dashboard user={user} initialView="create" initialTaskId={taskId} />;
}
