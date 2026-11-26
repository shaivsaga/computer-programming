import Image from "next/image";

export default function AuthShell({ title, sprite, children }) {
  return (
    <main className="auth-shell">
      <header className="masthead">
        <Image src="/art/brand-lock.png" width={32} height={32} alt="" unoptimized />
        <span className="wordmark">Login App</span>
      </header>
      <div className="auth-layout">
        <div className="art-stage" aria-hidden="true">
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
        <section className="auth-panel" aria-labelledby="screen-title">
          <h1 id="screen-title">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
