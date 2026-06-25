export function CodeWindow() {
  const lines: Array<{ n: number; parts: Array<{ t: string; c?: string }> }> = [
    { n: 1, parts: [{ t: "pip install ", c: "kw" }, { t: '"inferencache[embed,serve]"', c: "str" }] },
    { n: 2, parts: [{ t: "inferencache serve", c: "cmd" }] },
    { n: 3, parts: [] },
    { n: 4, parts: [{ t: "# Claude Code / Cursor", c: "cmt" }] },
    { n: 5, parts: [{ t: "export ", c: "kw" }, { t: "ANTHROPIC_BASE_URL=http://localhost:8080", c: "str" }] },
    { n: 6, parts: [] },
    { n: 7, parts: [{ t: "# repeat call  → ", c: "cmt" }, { t: "cache hit       0ms    $0.00", c: "ok" }] },
    { n: 8, parts: [{ t: "# near-match     → ", c: "cmt" }, { t: "semantic hit    4ms    $0.00", c: "ok" }] },
    { n: 9, parts: [{ t: "# new prompt     → ", c: "cmt" }, { t: "api call      820ms  $0.0031", c: "dim" }] },
  ];

  return (
    <div className="landing-code-window">
      <div className="landing-code-titlebar">
        <div className="landing-code-dots">
          <span /><span /><span />
        </div>
        <span className="pc-mono landing-code-filename">setup.sh</span>
        <span className="pc-mono landing-code-lang">shell</span>
      </div>
      <div className="landing-code-body">
        <div className="landing-code-gutter pc-mono">
          {lines.map((l) => (
            <div key={l.n}>{l.n}</div>
          ))}
        </div>
        <div className="landing-code-content pc-mono">
          {lines.map((l) => (
            <div key={l.n}>
              {l.parts.length === 0 ? "\u00A0" : l.parts.map((p, i) => (
                <span key={i} className={p.c ? `lc-${p.c}` : undefined}>{p.t}</span>
              ))}
            </div>
          ))}
          <span className="lc-cursor">▋</span>
        </div>
      </div>
    </div>
  );
}
