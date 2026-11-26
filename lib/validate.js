const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readCredentials(body) {
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  return { email, password };
}

// bcrypt only uses the first 72 bytes, so cap there.
export function passwordProblem(password) {
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return "Password must be 8 to 72 characters.";
  }
  return null;
}
