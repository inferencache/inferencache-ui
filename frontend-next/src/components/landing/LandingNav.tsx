import { Logo } from "@/components/Logo";

const GITHUB_URL = "https://github.com/lavondev";
const GITHUB_REPO_URL = "https://github.com/lavondev/inferencache";
const X_URL = "https://twitter.com/justindev_";

export function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-brand">
        <Logo size={22} />
        <span className="pc-mono landing-nav-wordmark">inferencache</span>
      </div>
      <div className="landing-nav-links">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={X_URL} target="_blank" rel="noopener noreferrer">X</a>
      </div>
    </nav>
  );
}

export { GITHUB_URL, GITHUB_REPO_URL, X_URL };
