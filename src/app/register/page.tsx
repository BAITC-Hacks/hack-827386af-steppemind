import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthForm from "@/components/auth-form";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="register" />;
}
