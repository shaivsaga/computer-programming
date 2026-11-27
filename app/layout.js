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
    var d=document.documentElement;
    d.classList.add('js');
    var t=localStorage.getItem('tt_theme');
    if(t==='dark'||t==='light'){d.dataset.theme=t;}
    var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(window.location.pathname==='/'&&!rm&&sessionStorage.getItem('tt_triage_seen')!=='1'){
      d.dataset.triage='pending';
      setTimeout(function(){if(d.dataset.triage==='pending')delete d.dataset.triage;},1500);
    }
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
