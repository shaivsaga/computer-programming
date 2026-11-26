import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Log in | TaskTracker",
  description: "Log in to your account with your email and password.",
};

export default async function LoginPage({ searchParams }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;
  const plan = typeof params?.plan === "string" ? params.plan : "";
  return <AuthForm mode="login" selectedPlan={plan} />;
}
