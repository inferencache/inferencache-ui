# inferencache dashboard

Live monitoring and pressure-testing dashboard for [inferencache](https://github.com/inferencache/inferencache).

## Dev setup

Clone both repos as siblings, then run two terminals:

```bash
# Terminal 1 — proxy + API (port 8080)
cd inferencache
pip install -e ".[embed,serve,dev]"
inferencache serve
# proxy:     http://localhost:8080
# dashboard: http://localhost:8080/dashboard/

# Terminal 2 — frontend dev server (port 3000, only needed when editing the UI)
cd inferencache-dashboard/frontend-next
npm install
npm run dev
# http://localhost:3000 → API calls proxied to :8080
```

The `backend/` folder is a legacy dev shim — do not use it.

## Production

Built into the Python package via `./inferencache/scripts/build-dashboard.sh` and served by `inferencache serve`.

See [CONTRIBUTING.md](https://github.com/inferencache/inferencache/blob/main/CONTRIBUTING.md) in the main repo for full dev setup.
