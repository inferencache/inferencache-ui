const GITHUB_URL = "https://github.com/lavondev/inferencache";
const X_URL = "https://twitter.com/jaybhatt_";

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-brand">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <rect x="1.5" y="3.5" width="19" height="4" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" />
          <rect x="4" y="9.5" width="14" height="4" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" opacity="0.65" />
          <rect x="7" y="15.5" width="8" height="3" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" opacity="0.32" />
        </svg>
        <span className="pc-mono landing-nav-wordmark">inferencache</span>
      </div>
      <div className="landing-nav-links">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={X_URL} target="_blank" rel="noopener noreferrer">X</a>
      </div>
    </nav>
  );
}

export { GITHUB_URL, X_URL };
