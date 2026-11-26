import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Account | TaskTracker",
  description: "View your signed-in account.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthShell
      title="Account"
      sprite="open"
      isSignedIn
      statusLabel="Session active"
    >
      <dl className="account-details">
        <dt>Signed in as</dt>
        <dd>{user.email}</dd>
      </dl>
      <LogoutButton />
    </AuthShell>
  );
}
