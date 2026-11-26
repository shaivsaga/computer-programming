import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dashboard | Login App",
  description: "Your account dashboard.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="card">
      <h1>Dashboard</h1>
      <p>
        You are logged in as <strong>{user.email}</strong>.
      </p>
      <LogoutButton />
    </main>
  );
}
