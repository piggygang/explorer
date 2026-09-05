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
| `pnpm gen:fixtures` | Regenerate mock fixtures from `../dressme`'s data, plus demo art |
| `pnpm mock:prism` | Spec-faithful Prism mock of the contract on :4010 |

`gen:fixtures` resolves each sampled mint's `imageUri` from the committed
metaboss dumps in `../assets` — the on-chain metadata URI, then the re-hosted
one where the original host is gone — and records the URL. No art is downloaded
and none is committed: the mock points at the same media the real API will.
`../assets` is optional; without it every fixture keeps `imageUri: null`, which
is what the API returns for an un-ingested asset. A handful are left null on
purpose, one is left unchecked and one points at a dead host, so the
placeholder, the optimistic and the known-dead paths are all visible in review.

Fixture stats describe the fixture set, not the real collections — a card reads
"Supply 120", not "Supply 10,000". That is deliberate: the contract makes
`CollectionStats.indexed` the unfiltered browse count and `FacetsResponse.total`
the filtered one, so a headline that disagreed with the grid would make the
toolbar lie. `rarityRank` and `rarityScore` are synthetic for the same reason —
the browse card's rank badge has to be reviewable before ALG-627 ships — while
`sort=rarity` still answers `422 unsupported_sort` exactly as production does.

## Configuration

One variable, server-only (see `.env.example`):

- `API_BASE_URL` — the origin of the real indexer API, **without `/v1`** and
  without a trailing slash. The version prefix is part of the request path in
  the frozen contract, so it must not be in this value. Unset = mock mode. Pages
  fetch in Server Components, so the value never reaches the browser and the API
  needs no CORS.

To prove the env switch locally against a spec-faithful server:

```sh
pnpm mock:prism                                  # Prism on :4010
API_BASE_URL=http://localhost:4010 pnpm dev      # same pages, different backend
```

Prism replays the contract's own examples, so it answers every endpoint —
including `/v1/collections/{slug}/holders` and `/v1/search`, which the in-app
mock deliberately 404s because nothing calls them yet (ALG-638, ALG-634). It
also ignores `trait`, `sort` and `cursor`, so it proves contract fidelity and
the environment switch, not browsing.

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
