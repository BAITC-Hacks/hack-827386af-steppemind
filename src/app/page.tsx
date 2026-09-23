import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Dashboard from "@/components/dashboard";

export const runtime = "nodejs";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Dashboard user={user} />;
}
