# inferencache dashboard

Live pressure-testing dashboard for [inferencache](https://github.com/lavondev/inferencache).

## Dev setup

Two terminals, with both repos cloned as siblings:

```bash
# Terminal 1 — API backend
cd inferencache-dashboard/backend
pip install -e ../../inferencache[embed,serve]
./run.sh   # http://localhost:8000

# Terminal 2 — frontend
cd inferencache-dashboard/frontend-next
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000/api npm run dev
# landing:   http://localhost:3000/
# dashboard: http://localhost:3000/dashboard/
```

## Production

Built into the Python package via `./inferencache/scripts/build-dashboard.sh` and served by `inferencache serve`.
