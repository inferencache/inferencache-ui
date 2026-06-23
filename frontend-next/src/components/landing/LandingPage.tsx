import { GITHUB_URL, LandingNav, X_URL } from "@/components/landing/LandingNav";
import { CopyInstallBlock } from "@/components/landing/CopyInstallBlock";
import { CodeWindow } from "@/components/landing/CodeWindow";

const PROOF = [
  {
    num: "01",
    tag: "how it works",
    title: "Two-tier cache, one check",
    body: "Every call runs an exact match in SQLite, then a semantic search in Qdrant. Hit either layer and the response returns immediately — no network, no tokens, no cost. Miss both and the real call goes through and writes back.",
  },
  {
    num: "02",
    tag: "integration",
    title: "Proxy-first, nothing to rearchitect",
    body: "Point Cursor or Claude Code at localhost:8080 with one env var. No decorator, no gateway, no changed call signatures — your existing SDK calls just get cheaper.",
  },
  {
    num: "03",
    tag: "vs alternatives",
    title: "GPTCache is abandoned. Gateways are overhead.",
    body: "Every other caching layer either stopped shipping or routes traffic through infrastructure you don't own. inferencache is just a library — pip install inferencache. Your prompts stay on your machine.",
  },
  {
    num: "04",
    tag: "MCP server",
    title: "Your editor can see the cache too",
    body: "A read-only MCP server ships with the library. Cursor and Claude Code can inspect hit rates, cost savings, and cache state without leaving the editor.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-glow" aria-hidden />
      <div className="landing-inner">
        <LandingNav />

        <section className="landing-hero">
          <div className="landing-hero-left">
            <p className="landing-eyebrow pc-mono">LLM cost infrastructure</p>
            <h1 className="landing-headline">
              Stop paying for the same prompt <em>twice.</em>
            </h1>
            <p className="landing-subtext">
              A local proxy for LLM APIs. Exact-match and semantic deduplication intercept
              redundant calls before they cost you a token.{" "}
              <span className="landing-subtext-strong">One env var. No gateway.</span>
            </p>
            <div className="landing-cta-row">
              <CopyInstallBlock />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-github-btn"
              >
                View on GitHub
              </a>
            </div>
            <p className="landing-cta-note">Open source. Runs on your machine.</p>
          </div>
          <div className="landing-hero-right">
            <CodeWindow />
          </div>
        </section>

        <div className="landing-divider" />

        <section className="landing-proof-grid">
          {PROOF.map((item, i) => (
            <div
              key={item.num}
              className={`landing-proof-cell ${i % 2 === 1 ? "border-l" : ""} ${i < 2 ? "border-b" : ""}`}
            >
              <p className="landing-proof-label pc-mono">
                <span className="landing-proof-num">{item.num}</span>
                <span className="landing-proof-sep" />
                {item.tag}
              </p>
              <h3 className="landing-proof-title">{item.title}</h3>
              <p className="landing-proof-body">{item.body}</p>
            </div>
          ))}
        </section>

        <footer className="landing-footer">
          <span className="landing-footer-brand">
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect x="1.5" y="3.5" width="19" height="4" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" opacity="0.7" />
              <rect x="4" y="9.5" width="14" height="4" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" opacity="0.4" />
              <rect x="7" y="15.5" width="8" height="3" rx="1.4" stroke="#b86a2a" strokeWidth="1.3" opacity="0.2" />
            </svg>
            inferencache · built in public
          </span>
          <div className="landing-footer-links">
            <a href={X_URL} target="_blank" rel="noopener noreferrer">@jaybhatt_ on X</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
