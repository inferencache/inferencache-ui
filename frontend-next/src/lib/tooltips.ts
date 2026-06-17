/** Central copy for UI info tooltips */
export const TIPS = {
  // ── Configuration ──
  provider:
    "Which LLM API to call on cache misses. OpenAI and Anthropic use separate API keys.",
  model:
    "Model used for live API calls when the cache misses. Cached responses reuse the model that originally answered the prompt.",
  suite:
    "Prompt collection to replay. Each prompt is sent once per repeat round to measure cache behavior.",
  repeatFactor:
    "How many full passes over the suite to run. Round 2+ often hits the cache because prompts repeat — use 2× or more to see savings.",
  threshold:
    "Minimum cosine similarity (0.50–1.00) for a semantic cache hit. Higher = stricter matching, fewer false positives, more misses.",
  recommendedThreshold:
    "Suggested threshold from past runs for this suite + model. Apply to copy the value to your slider.",
  delayMs:
    "Milliseconds to wait between API calls. Increase if you hit provider rate limits.",
  uploadSuite:
    "Add a custom .json (array of prompts) or .csv (column named prompt) file to the suite list.",

  // ── Metrics strip ──
  totalCalls: "Number of prompt lookups completed in the current run.",
  hitRate:
    "Share of calls served from cache (exact + semantic) instead of the live API.",
  exactHits:
    "Prompt matched byte-for-byte (SHA-256). Fastest path — no embedding or API call.",
  semanticHits:
    "Prompt matched by embedding similarity above your threshold. Returns a prior response without a new API call.",
  tokensSaved:
    "Output tokens not sent to the API because a cached response was returned.",
  costSaved:
    "Estimated USD avoided vs calling the API for every prompt at this model's output token price.",

  // ── Hit breakdown ──
  hitBreakdown:
    "Visual split of exact hits (green), semantic hits (amber), and misses (gray) for this run.",
  exactLegend: "Identical prompt text seen before — instant cache return.",
  semanticLegend: "Similar prompt above threshold — returns the closest cached answer.",
  missLegend: "No cache match — triggers a live API call and stores the new response.",

  // ── Call log ──
  callLog:
    "Live feed of each prompt lookup. Click a row for full detail; ERR rows show API failures.",
  filterAll: "Show every call and error from this run.",
  filterExact: "Only SHA-256 exact cache hits.",
  filterSemantic: "Only embedding-based semantic hits.",
  filterMiss: "Only lookups that called the live API.",
  filterError: "Only failed API calls with error messages.",

  // ── Run progress ──
  runProgress:
    "Suite execution status. Progress counts completed prompts including errors. ETA uses average call latency.",

  // ── Past runs ──
  pastRuns:
    "Saved run summaries from the local database. Click to reload results in the main panel; right-click to delete.",

  // ── Analytics ──
  analyticsWindow:
    "Time range for charts and tables — all data is filtered to this window for the selected model.",
  costSavedChart:
    "Running total of USD avoided by cache hits over the selected window.",
  hitRateChart:
    "Stacked hits over time: exact (green), semantic (teal), and misses (red) per time bucket.",
  endpointBreakdown:
    "Per-endpoint call volume, hit rate, latency, and savings — useful when multiple clients share the cache.",

  // ── Tuning ──
  tuningThreshold:
    "Preview how many past semantic near-matches would pass at different thresholds before applying to live runs.",
  similarityDist:
    "Histogram of similarity scores for semantic lookups. Bars right of the yellow line would hit at the preview threshold.",
  falsePositiveQueue:
    "Semantic hits you flagged as wrong in the call drawer. Review and unflag after tuning threshold.",
} as const;
