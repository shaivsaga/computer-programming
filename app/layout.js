import "./globals.css";

export const metadata = {
  title: "Login App",
  description: "Email and password login backed by MySQL.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
