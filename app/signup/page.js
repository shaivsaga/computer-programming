import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sign up | TaskTracker",
  description: "Create an account with your email and a password.",
};

export default async function SignupPage({ searchParams }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;
  const plan = typeof params?.plan === "string" ? params.plan : "";
  return <AuthForm mode="signup" selectedPlan={plan} />;
}
