"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";

export default function LogoutButton() {
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      window.location.replace("/login");
    } catch {
      setError("Couldn’t log out. Try again.");
    }
  }

  return (
    <div className="auth-submit-slot">
      {error && <p role="alert" className="error">{error}</p>}
      <Button type="button" variant="primary" width="100%" label="Log out" clickAction={handleLogout} />
    </div>
  );
}
