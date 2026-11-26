import Image from "next/image";
import TopBar from "./TopBar";

export default function AuthShell({
  title,
  sprite,
  isSignedIn = false,
  statusLabel,
  planName,
  children,
}) {
  return (
    <div className="auth-page pixel-grid-bg">
      <TopBar isSignedIn={isSignedIn} />
      <main className="auth-shell">
        <div className="auth-layout">
          <div className="art-stage">
            <div className="art-card">
              <div className="art-card-head">
                <span className="art-status">{statusLabel}</span>
                {planName && <span className="art-plan">Plan: {planName}</span>}
              </div>
              <div className="art-canvas">
                <Image
                  className="lock-sprite"
                  src={`/art/lock-${sprite}.png`}
                  alt=""
                  width={380}
                  height={296}
                  loading="eager"
                  unoptimized
                />
              </div>
              <p className="art-caption">
                Sign in with your section email to access your PostgreSQL-backed
                account session.
              </p>
            </div>
          </div>

          <section className="auth-panel" aria-labelledby="screen-title">
            <h1 id="screen-title">{title}</h1>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
