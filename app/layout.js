import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Login App",
  description: "Create an account or log in with your email and password.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
