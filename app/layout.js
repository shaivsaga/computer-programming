import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "TaskTracker | Calm Class Board & Study Hall Portal",
  description:
    "Shared class assignment board with local progress, calendar view, and PostgreSQL account portal.",
};

const THEME_INIT_SCRIPT = `
(function(){
  try{
    document.documentElement.classList.add('js');
    var t=localStorage.getItem('tt_theme');
    if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}
  }catch(e){}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
