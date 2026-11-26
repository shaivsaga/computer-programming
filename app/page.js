import { getCurrentUser } from "@/lib/auth";
import LandingClient from "@/components/LandingClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Allow the landing page to render cleanly even without a local database.
    user = null;
  }

  return (
    <LandingClient
      isSignedIn={Boolean(user)}
      userEmail={user?.email ?? null}
    />
  );
}
