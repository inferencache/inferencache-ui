# promptcache dashboard — Design Brief for Claude

## What this product is

promptcache is a multi-tier LLM caching library. The dashboard is the
testing and observability surface — developers run prompt suites against
real API keys, see cache hits vs misses in real time, and understand
exactly where their token budget is going. It is not a marketing page.
It is a tool used by engineers and technical founders who care about
numbers, precision, and signal-to-noise ratio.

The landing page (already designed well) uses this visual language:
- Very dark background (#0c0e12 range)
- Orange (#f97316) as the single accent — used sparingly for CTAs only
- Teal/green (#10d9a0) for positive/hit states
- Amber (#f5a623) for semantic/warning states
- Red (#f06a6a) for miss/error states
- Monospace font (JetBrains Mono) for all numbers, latencies, costs
- Inter for all UI text
- Minimal borders, low-opacity dividers, no heavy card shadows

The app must feel like it belongs to the same product as the landing
page. Right now it does not.

---

## The four pages and what each one does

### Page 1: Cache testing (main page)

This is where users spend 80% of their time. It has two panels:

LEFT SIDEBAR — Configuration:
- Provider toggle: OpenAI / Anthropic (pill tabs)
- Model selector dropdown
- Suite selector dropdown (general_qa / coding / summarization +
  any uploaded custom suites)
- Repeat factor: 1× 2× 3× 4× 5× (segmented button row)
- Upload custom suite (.json or .csv)
- Similarity threshold: range slider with numeric readout
- Pause between calls: number input (ms)
- "Run test suite" button — PRIMARY CTA, orange, full width
- "Clear cache for this model" — secondary, destructive, subtle
- Past runs list at the bottom: run ID (monospace, 8 chars),
  suite name, model, hit rate badge, cost, date. Clicking loads
  that run's data into the right panel.

RIGHT MAIN PANEL — Live results:
Six metric cards across the top (always visible, never scroll):
  1. TOTAL CALLS — large monospace number
  2. HIT RATE — percentage, green when >50%, amber 20–50%, neutral below
  3. EXACT HITS — count, green
  4. SEMANTIC HITS — count, amber
  5. TOKENS SAVED — count with comma formatting, purple
  6. COST SAVED — dollar amount, green, this is the hero number

Below metrics:
- Hit breakdown: horizontal segmented bar showing exact (green) /
  semantic (amber) / miss (gray) proportions. Updates live.
  Text below: "15 exact · 18 semantic · 15 miss — 69% hit rate"

- Progress bar: shows run completion (48/48 Done) with elapsed time
  and "Saved as #0b9ffa4b" run ID when complete. CSV and Chart
  export buttons appear here on completion.

- Two charts side by side:
  LEFT: Latency per call — line chart. TWO lines: Cache hit (teal,
  near-zero, flat) and API call (red, 1000–8000ms range, spiky).
  The visual contrast between these two lines IS the product value.
  The gap should be dramatic and immediately readable.
  RIGHT: Cost per call — bar chart. Green bars ($0.000000) for
  cache hits, orange bars (variable) for API calls. Same story
  told differently.

- Call log table — the most information-dense element:
  Columns: # | RESULT | LATENCY | TOKENS | COST | SIM | PROMPT
  RESULT badge: MISS (red/orange) | SEM (amber) | EXACT (teal/green)
  Numbers in monospace. Prompt text truncated with ellipsis.
  Filter pills above: All N | Exact N | Semantic N | Miss N | Error N
  Rows animate in one at a time as calls complete (staggered entry).
  Clicking a row opens a call drawer (side panel) with full details.

CALL DRAWER (slides in from right on row click):
- Full prompt text (not truncated)
- Hit type + similarity score
- For semantic hits: "Matched cached prompt: [original prompt text]"
  — this is critical UX, users need to see WHAT it matched against
- Latency breakdown
- Token counts (input / output) — null on cache hits
- Cost ($0.000000 on hits)
- Timestamp
- "Flag as false positive" toggle — only visible on SEM rows

---

### Page 2: Analytics

Time-windowed historical view. Window selector: 1h | 6h | 24h | 7d | 30d

Currently this page has too much empty space and the charts feel
disconnected. It needs better visual hierarchy.

Layout from top to bottom:

HERO SECTION — "Cumulative cost saved"
Large number. This is the reason the product exists. It should be
treated like a hero stat, not a chart label. Format: $0.1312 in large
green monospace. Subtitle: "over last 24h" in muted text.
Line chart below showing the savings curve over the selected window.
The curve should trend upward — visually satisfying.

SAVINGS BY TIER — three-row table:
| Tier | Hits | Tokens Saved | Cost Saved |
|---|---|---|---|
| Tier 1 — Semantic cache | 33 | 10,930 | $0.1312 |
| Tier 2 — Prefix cache | 0 | 0 | $0.0000 |
| Tier 3 — Inference cache | 0 | 0 | $0.0000 |

This table matters because it shows Tier 1 (client-side, free),
Tier 2 (provider discount on cached input tokens from prefix
optimization), and Tier 3 (provider-side inference cache hits)
as distinct savings sources. Currently shows all zeros on a fresh
cache — the empty state should explain WHY each tier is zero
and what would cause it to populate. Don't just show dashes.

HIT RATE OVER TIME — stacked area chart showing exact / semantic /
miss as three bands over time. Green at bottom (exact), amber above
(semantic), dark/muted at top (miss). As cache warms up, the green
and amber bands grow.

ENDPOINT BREAKDOWN TABLE — sortable:
Endpoint | Calls | Hit Rate | Avg Latency | Cost Saved
Rows represent different API routes or function names that made
LLM calls. Helps users identify which parts of their app cache well.

Export CSV button top right. Refresh button.

---

### Page 3: Tuning

Three sections:

1. SIMILARITY THRESHOLD
   Large slider, 0.50 (permissive) to 0.99 (strict), current value
   displayed prominently. Orange "Apply" button.
   Context text: "Higher = stricter matching. Current: 0.85"
   Per-type threshold info: show that CODE uses 0.92, DETERMINISTIC
   0.95, RAG 0.88, CONVERSATIONAL 0.82 when tier="auto".

2. PREFIX OPTIMIZER
   System prompt stability score — currently shows "100%" in green
   when no dynamic content detected.
   Textarea for pasting system prompt.
   Analysis result: green "No dynamic content detected — good prefix
   cache stability" OR warning list flagging {user}, {date},
   {session_id}, current year, file paths in the system prompt.
   Tip text: "Move file paths, timestamps, and user-specific values
   to the end of the message array instead of the system prompt."

3. SIMILARITY DISTRIBUTION
   Histogram of similarity scores from past semantic hits.
   X-axis: 0.50 → 1.00. Y-axis: hit count.
   Empty state: "No semantic hits yet — run a test suite"
   This chart helps users see if their threshold is cutting off
   legitimate hits or allowing in false positives.

4. FALSE POSITIVE QUEUE
   List of semantic hits manually flagged from the call drawer.
   Each item shows: original prompt | matched prompt | similarity
   score | Dismiss / Confirm buttons.
   Empty state: "No false positives flagged yet"

---

### Page 4: Saved runs

Table of all historical test runs, searchable.

LEFT PANEL — runs list:
Columns: ID (8-char monospace) | Suite | Model | Hit Rate | Calls | Created
Rows are clickable. Selected row highlighted with left-edge accent line
(same pattern as active nav item). Search bar at top.

RIGHT PANEL — selected run detail:
Run metadata grid: Suite | Model | Provider | Threshold | Repeat |
Hit Rate | Exact Hits | Semantic Hits | Tokens | Cost | Duration |
Calls | Cache Mode (warm/cold)

Call records table with tabs: All | Exact | Semantic | Miss
Columns: # | Type | Latency | Tokens | Cost | Similarity |
Best Match (similarity to top cached entry) | Prompt | Response
"Sort by similarity" button. Row count shown.

This page is actually well designed in the current screenshots —
the two-panel layout works. Main issue is the visual weight of the
type badges and the table density.

---

## Navigation

The nav is a hamburger menu that opens a right-side panel (visible
in screenshots 1 and 3). Current structure:

PAGES:
- Cache testing (play icon)
- Analytics (database/grid icon)
- Tuning (sliders/dial icon)
- Saved runs (clock icon)

TOOLS (in same panel):
- Configuration
- API keys (badge showing count of configured keys)
- Open chart (links to chart-output.com with current data)
- Theme toggle

RUN section (when a run is active or complete):
- Status: Done / Running
- Clear cache

Bottom: connection status — green dot, localhost:8000, latency in ms

The hamburger menu approach means the nav is hidden until needed,
which is correct for a tool where the content is the focus. The
nav panel design needs to match the overall aesthetic.

---

## Key UX principles to apply

1. Numbers are the product. Every metric should be in JetBrains Mono,
   correctly sized for its importance. The cost saved number should
   always be the most visually prominent thing on any page that shows it.

2. Color is semantic, not decorative:
   - Teal/green ONLY for: exact hits, positive outcomes, cost saved,
     "good" states
   - Amber ONLY for: semantic hits, warnings, borderline states
   - Orange ONLY for: the primary CTA button (Run test suite, Apply)
   - Red ONLY for: misses, errors, destructive actions
   - Purple ONLY for: token counts
   - Never use these colors decoratively

3. The hit rate badge should change color based on value:
   >60% → green, 30–60% → amber, <30% → default/neutral

4. Empty states need to be informative, not just "no data":
   - Analytics with no data: explain what a run does and add a
     shortcut to run one
   - Tuning similarity distribution: "Run a suite to see how your
     semantic hits cluster"
   - False positive queue: "Flag suspicious semantic hits from the
     call drawer during a test run"

5. The call log is the most complex element. Key requirements:
   - Rows must animate in one at a time (not all at once) during
     a live run — this communicates that calls are happening in
     real time
   - MISS rows should feel expensive (red cost numbers)
   - HIT rows should feel free (cost column shows $0.000000 in muted
     green or simply "—")
   - The SIM column only shows values for SEM rows, dash for others
   - Clicking any row should open the call drawer — this must be
     visually apparent (cursor: pointer, subtle hover state)

6. The latency chart's two lines (cache hit vs API call) are the
   single most compelling visual in the product. The teal line
   should hug the X-axis (near zero). The red line should spike
   dramatically. This contrast IS the value proposition made visual.
   Never obscure or flatten this chart.

7. Accessibility:
   - All color-coded states must have a secondary indicator (badge
     text, not just color — MISS / SEM / EXACT labels)
   - Interactive elements need visible focus states
   - Table rows need keyboard navigation (up/down arrows)
   - The threshold slider needs keyboard increment support
   - Sufficient contrast on all text (WCAG AA minimum)
   - Tooltips on metric cards explaining what each number means
     (the ⓘ icons visible in current screenshots are correct)

8. The sidebar configuration panel stays fixed. The main content
   area scrolls. On narrower viewports the sidebar collapses
   behind a toggle.

---

## What is currently wrong (from screenshots)

Cache testing page:
- The metric cards (image 2) have good information but inconsistent
  visual weight — COST SAVED should be the largest/most prominent
- The latency chart's Y-axis labels are too small to read
- The call log badge colors work but the row hover state is not
  obvious enough — needs clearer affordance that rows are clickable

Analytics page (image 4):
- Massive empty space in the cumulative cost saved section — the
  chart area is too tall for no data
- "Savings by tier" table reads as three identical zero rows with
  no explanation of what would make them non-zero
- No empty state guidance anywhere

Tuning page (image 5):
- Good structure, the prefix optimizer section works well
- The "3 errors" toast (bottom left) suggests there are runtime
  errors — these need to be caught and displayed in context rather
  than as a generic error count
- The similarity distribution empty state is fine but could point
  more directly to what to do

Saved runs page (image 6):
- This page is the best designed of the four — the two-panel
  layout works and the information density is appropriate
- Main fix: the Best Match column is confusing — rename to
  "Top similarity" and add a tooltip explaining it shows the
  cosine similarity to the nearest cached entry at query time

Nav panel (images 1, 3):
- Clean and functional but the TOOLS section items (Configuration,
  API keys, Open chart, Theme) feel like afterthoughts — they need
  a consistent icon treatment matching the PAGES section

---

## Tone

This is a developer tool. It should feel precise, dense with useful
information, and visually calm. No animations beyond the call log
row entry animation and chart line drawing. No gradients except
extremely subtle ones where necessary. No rounded corners larger
than 8px on cards. Borders should be barely visible (rgba white,
5–9% opacity). Everything earns its space.

The landing page sets the tone correctly. The app needs to match it.
