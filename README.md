# promptcache testing dashboard

Live pressure-testing dashboard for promptcache. Fire real LLM calls through the semantic cache, watch hits vs misses in real time, track token spend and cost savings per call, export charts to chart-output.com.

---

## Setup

Two terminals.

### Terminal 1 — Backend (FastAPI)

```bash
cd promptcache-dashboard/backend
# First-time setup (only needed once):
/Users/justingaddy/anaconda3/envs/promptcache/bin/pip install -r requirements.txt

# Start the server (always use this — avoids picking up the wrong Python):
./run.sh
```

### Terminal 2 — Frontend (Next.js)

```bash
cd promptcache-dashboard/frontend-next
npm install
npm run dev
# -> http://localhost:3000
```

---

## What you'll see

**Stats bar** (top) — six live metrics, updates per call:
- Total calls · Hit rate · Exact hits · Semantic hits · Tokens saved · Cost saved

**Charts** (middle):
- Latency: green line = cache hits, red = API calls.
- Cost: green bars = $0 (cache hit), orange = billed.

**Call log** (bottom) — per-call console: badge (EXACT / SEM / MISS), latency, tokens, cost, similarity score, prompt preview.

---

## Running a test

1. Paste your API key in the sidebar
2. Pick a model and prompt suite
3. Set **repeat factor >= 2** (this generates cache hits)
4. Click **Run suite**
5. Click **Export to chart-output.com** to share

---

## Project layout

```
backend/
  main.py               FastAPI, SSE, LLM routing, promptcache integration
  requirements.txt
  prompt_suites/        Built-in JSON suite files

frontend-next/
  src/
    app/                Next.js App Router
    components/         React components
    lib/                API client + useRunSession hook
    types/              Shared TypeScript types
  .env.local            NEXT_PUBLIC_API_URL=http://localhost:8000
```
