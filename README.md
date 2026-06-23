# promptcache testing dashboard

Live pressure-testing dashboard for [promptcache](https://github.com/lavondev/promptcache). Fire real LLM calls through the semantic cache, watch hits vs misses in real time, track token spend and cost savings per call.

---

## For end users

Use the main library — no need to clone this repo:

```bash
pip install "promptcache[embed,serve]"
export ANTHROPIC_API_KEY=sk-ant-...
promptcache serve
# dashboard → http://localhost:8080/dashboard
# proxy     → http://localhost:8080
```

Set `ANTHROPIC_BASE_URL=http://localhost:8080` in Cursor, Claude Code, or your SDK.

---

## For UI contributors

Two terminals, with both repos cloned as siblings (see [CONTRIBUTING.md](https://github.com/lavondev/promptcache/blob/main/CONTRIBUTING.md) in the main repo).

### Terminal 1 — Backend (dev shim)

```bash
cd backend
pip install -e ../../promptcache[embed,serve]
./run.sh
# → http://localhost:8000/api
```

### Terminal 2 — Frontend (Next.js)

```bash
cd frontend-next
cp .env.example .env.local
# Set: NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev
# → http://localhost:3000
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

---

## Project layout

```
backend/
  main.py               Dev shim — imports promptcache.proxy.control
  run.sh                Start uvicorn on :8000
  requirements.txt      pip install -e ../../promptcache[serve]

frontend-next/
  src/
    app/                Next.js App Router
    components/         React components
    lib/                API client + useRunSession hook
  .env.example          API URL config
```

Built-in prompt suites ship in the main `promptcache` package under `proxy/data/prompt_suites/`.
