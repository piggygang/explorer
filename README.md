# piggygang-explorer

Public explorer for the Piggy collections — faceted attribute search,
owner lookup and per-NFT transaction history. Next.js on Vercel, styled like
[dressme](https://github.com/piggygang/dressme), powered entirely by the
PiggyGang Indexer API. Target home: `explorer.piggygang.net`.

## Requirements

- Node 24 + pnpm 11 (both pinned in `.tool-versions` / `package.json`)

## Getting started

```sh
pnpm install
pnpm dev
```

That's it — with no environment configured the app runs in **mock mode**,
serving committed fixture data (real mints and traits, sampled from dressme's
indexes) through the same generated API client the real backend will use.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `build` / `start` / `lint` | The usual Next.js four |
| `pnpm sync:spec` | Re-vendor `openapi/v1.yaml` from `../indexer` + regen types |
| `pnpm gen:api` | Regenerate `lib/api/schema.d.ts` from the vendored spec |
| `pnpm gen:fixtures` | Regenerate mock fixtures from `../dressme`'s data |
| `pnpm mock:prism` | Spec-faithful Prism mock of the contract on :4010 |

## Configuration

One variable, server-only (see `.env.example`):

- `API_BASE_URL` — base URL of the real indexer API **including `/v1`**, no
  trailing slash. Unset = mock mode. Pages fetch in Server Components, so the
  value never reaches the browser and the API needs no CORS.

To prove the env switch locally against a spec-faithful server:

```sh
pnpm mock:prism                                  # Prism on :4010
API_BASE_URL=http://localhost:4010 pnpm dev      # same pages, different backend
```

The in-app mock is also reachable over HTTP at `/api/mock/v1/*`
(e.g. `curl localhost:3000/api/mock/v1/collections`).

## API contract

`../indexer/openapi/v1.yaml` (ALG-620) is the contract of record; this repo
vendors a byte-identical copy at `openapi/v1.yaml` and commits the generated
types. A contract change is always two commits — indexer first, then
`pnpm sync:spec` here. CI regenerates the types and fails on drift.

## Deployment (Vercel)

Zero-config: framework, pnpm and Node 24 are all autodetected from the repo,
and mock mode needs no environment, so a fresh import deploys green.

1. vercel.com → **Add New… → Project** → import `piggygang/explorer`
2. Accept the detected defaults → **Deploy**
3. Pushes to `main` become production; every PR gets a preview deploy
4. Later: Project → Settings → Domains → add `explorer.piggygang.net`
   (CNAME at the DNS host)
5. When the real API ships: set `API_BASE_URL` in Project → Settings →
   Environment Variables and redeploy — that is the entire switch
