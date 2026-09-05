// Generates lib/api/fixtures/*.ts from the sibling dressme repo's committed
// data (public/piggy/*/mints.txt, tokens.txt, lib/collections.generated.ts),
// so the mock serves real mints and real trait combinations. The output is
// committed; re-run only to change the sample. Requires ../dressme on disk.
//
//   pnpm gen:fixtures
//
// Piggy Gang has no mints.txt (its Core assets are minted on demand and their
// ids are recorded nowhere), so its fixture ids are sentinel-style base58 —
// obviously synthetic, never plausible fakes.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRESSME = path.resolve(HERE, "../../dressme");
const OUT = path.resolve(HERE, "../lib/api/fixtures");

// The sibling asset repo holds the committed metaboss dumps, which carry each
// mint's on-chain metadata URI. It is optional: without it every fixture keeps
// imageUri null, which is what the API returns for an un-ingested asset anyway.
// No art is downloaded or committed — see the image pass below.
const ASSETS = path.resolve(HERE, "../../assets");
// Where each collection's metadata was re-hosted after its original host went
// away, mint by mint.
const REHOST_MAPS = {
  "piggy-girl-gang": [
    "piggy-girl-gang-new-uris.json",
    "piggy-girl-gang-new-uris-remaining.json",
    "piggy-girl-gang-new-uris-remaining-2.json",
  ],
};
const ART_METADATA = {
  "piggy-sol-gang": "piggy-sol-gang-metaboss-full",
  "piggy-girl-gang": "piggy-girl-gang-metaboss-full",
};
// One fixture points at a host that will never answer, so the dead-image path
// is visible in review rather than merely implemented.
const DEAD_IMAGE_URL = "https://arweave.net/this-link-rotted-in-2021.png";

// Mirrors dressme lib/collections.ts — the wire alphabet of look codes.
const LOOK_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

// How many sample tokens per collection. Enough that every collection has more
// than one page at the contract's default limit of 24, so the browse grid's
// append path is exercised everywhere and not just on the largest collection.
const SAMPLE = [
  { slug: "piggy-sol-gang", count: 120, standard: "token_metadata" },
  { slug: "piggy-girl-gang", count: 72, standard: "token_metadata" },
  { slug: "piggy-gang", count: 30, standard: "core" },
];

const SYMBOL = {
  "piggy-sol-gang": "PSG",
  "piggy-girl-gang": "PGG",
  // The Core collection carries no symbol on chain.
  "piggy-gang": null,
};

// How membership is derived. The two Token Metadata collections have no
// certified collection on chain, so they are committed allowlists; the Core one
// grows on its own as assets are minted into it.
const MEMBERSHIP_RULE = {
  "piggy-sol-gang": "tm_allowlist",
  "piggy-girl-gang": "tm_allowlist",
  "piggy-gang": "core_collection",
};

const COLLECTION_ADDRESS = {
  // Token Metadata collection addresses are not recorded anywhere yet — the
  // team must supply them (ALG-619). null, exactly as the contract allows.
  "piggy-sol-gang": null,
  "piggy-girl-gang": null,
  // The one on-chain address the org records: the Core CollectionV1.
  "piggy-gang": "J3nHgSDJj6CPj2ypuDWNuvuiYii965RcSmFAPQVDWA18",
};

const DISPLAY_NAME = {
  "piggy-sol-gang": "Piggy SOL Gang",
  "piggy-girl-gang": "Piggy Girl Gang",
  "piggy-gang": "Piggy Gang",
};

// Sentinel base58: valid alphabet, obviously synthetic (Solana convention —
// compare So11111111111111111111111111111111111111112).
const pad = (prefix, len) => prefix + "1".repeat(len - prefix.length);
const DEMO_WALLET = pad("DemoWa11et", 43);
const WALLETS = [
  DEMO_WALLET,
  pad("Ho1derA", 43),
  pad("Ho1derB", 43),
  pad("Ho1derC", 43),
  pad("Ho1derD", 43),
];
const sentinelSignature = (n) => pad(`Sig${n}x`, 87);
const sentinelCoreId = (n) => pad(`CoreAsset${n}x`, 43);

// ---------------------------------------------------------------- sources

function loadManifest() {
  const text = readFileSync(
    path.join(DRESSME, "lib/collections.generated.ts"),
    "utf8",
  );
  const start = text.indexOf("= {");
  const end = text.lastIndexOf("};");
  return JSON.parse(text.slice(start + 2, end + 1));
}

function loadFixedWidth(file, expectHeaderSlug) {
  const text = readFileSync(file, "utf8");
  const newline = text.indexOf("\n");
  const header = text.slice(0, newline).split(" ");
  if (header[0] !== "v1" || header[1] !== expectHeaderSlug) {
    throw new Error(`${file}: unexpected header ${header.join(" ")}`);
  }
  return {
    stride: Number(header[2]),
    firstId: Number(header[3]),
    count: Number(header[4]),
    body: text.slice(newline + 1),
  };
}

function mintAt(index, id) {
  const row = index.body.slice(
    (id - index.firstId) * index.stride,
    (id - index.firstId + 1) * index.stride,
  );
  return row.trimEnd();
}

/** Decode one tokens.txt row into [{traitType, value}] via the manifest. */
function attributesAt(manifest, index, id) {
  const row = index.body.slice(
    (id - index.firstId) * index.stride,
    (id - index.firstId + 1) * index.stride,
  );
  const code = row.slice(0, index.stride - 3);
  const bySlot = {};
  for (let i = 0; i < code.length; i += 1) {
    const categoryId = manifest.codeOrder[i];
    const category = manifest.categories.find((c) => c.id === categoryId);
    const values = category.optional
      ? [null, ...category.traits]
      : category.traits;
    const value = values[LOOK_ALPHABET.indexOf(code[i])];
    if (value) bySlot[categoryId] = value.name;
  }
  // Emit in the manifest's category order (presentation order), not code order.
  return manifest.categories
    .filter((category) => bySlot[category.id])
    .map((category) => ({
      traitType: category.metaName ?? category.label,
      value: bySlot[category.id],
    }));
}

// ---------------------------------------------------------------- build

const manifests = loadManifest();
const collections = [];
const nfts = [];

for (const { slug, count, standard } of SAMPLE) {
  const manifest = manifests[slug];
  const tokens = loadFixedWidth(
    path.join(DRESSME, "public/piggy", slug, "tokens.txt"),
    slug,
  );
  const mints =
    standard === "token_metadata"
      ? loadFixedWidth(path.join(DRESSME, "public/piggy", slug, "mints.txt"), slug)
      : null;

  for (let n = 0; n < count; n += 1) {
    const id = tokens.firstId + n;
    const address = mints ? mintAt(mints, id) : sentinelCoreId(id);
    // The contract's own examples name Token Metadata assets "<Collection> #N"
    // even though the metaboss dumps show the bare on-chain "#N". Following the
    // examples, because ?q= substring search is specified against them; one
    // line to flip if the indexer says otherwise.
    const name = standard === "core" ? `#${id}` : `${DISPLAY_NAME[slug]} #${id}`;
    nfts.push({
      collectionSlug: slug,
      address,
      name,
      number: id,
      // Filled in by the image pass below, once the addresses are known.
      imageUri: null,
      imageStatus: "unknown",
      burned: false,
      owner: n < 2 ? DEMO_WALLET : WALLETS[1 + (n % (WALLETS.length - 1))],
      // Filled in by the history pass below.
      lastActivityAt: null,
      // SYNTHETIC, and the only invented values in this file. The real API
      // returns null for both until rarity scoring ships (ALG-627) — the
      // contract says so in as many words. They exist here so the browse card's
      // rank badge is reviewable; `sort=rarity` still answers 422
      // unsupported_sort exactly as production does, so nothing else can lean
      // on them.
      rarityRank: null,
      rarityScore: null,
      standard,
      symbol: SYMBOL[slug],
      membershipStatus: "member",
      removedAt: null,
      metadataUri: null,
      metadataSourceUri: null,
      imageCheckedAt: null,
      updatedAt: null,
      attributes: attributesAt(manifest, tokens, id).map((attribute, position) => ({
        ...attribute,
        position,
        // Girl Gang's per-asset-unique "Name" is the collection's facet_exclude
        // case: shown as a chip, never linked to a filtered browse URL.
        isFacet: attribute.traitType !== "Name",
        // Reserved by the contract, always null until ALG-627. Trait chips take
        // their share from facet counts instead (lib/rarity.ts).
        rarityPct: null,
      })),
    });
  }
}

// Rank within each collection by trait scarcity, rarest first. Synthetic but not
// arbitrary: a random rank would read as wrong the moment a reviewer opened a
// one-of-a-kind pig and found it ranked 90th.
for (const { slug } of SAMPLE) {
  const rows = nfts.filter((nft) => nft.collectionSlug === slug);
  const counts = new Map();
  for (const nft of rows) {
    for (const attribute of nft.attributes) {
      const key = `${attribute.traitType} ${attribute.value}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const scored = rows.map((nft) => ({
    nft,
    // Sum of inverse frequencies, the usual open rarity-score shape.
    score: nft.attributes.reduce(
      (total, attribute) =>
        total + rows.length / counts.get(`${attribute.traitType} ${attribute.value}`),
      0,
    ),
  }));
  scored.sort((a, b) => b.score - a.score);
  scored.forEach(({ nft, score }, index) => {
    nft.rarityRank = index + 1;
    nft.rarityScore = Math.round(score * 100) / 100;
  });
}

// ------------------------------------------------------------- image pass
//
// imageUri is "where the image actually lives — already the re-hosted URL for
// collections whose original host is gone". That re-host is real and serving,
// and the committed metaboss dumps carry each mint's metadata URI, so the
// fixtures point straight at it. Nothing is downloaded and nothing is
// committed: a mock that served locally-resized WebP would be rehearsing a
// request path production never takes, and it put a megabyte of binaries in
// git for every sample size anyone ever tried.

// Two re-hosts, two layouts, both symmetrical: the image sits beside the
// metadata under a sibling directory. Deriving the URL by substitution beats
// one metadata fetch per asset, and anything that does not match falls back to
// reading the JSON.
const IMAGE_PATH_RULES = [
  // Piggy SOL Gang: .../old/metadata/<addr>.json -> .../old/images/<addr>.png
  [/\/metadata\/([^/]+)\.json$/, "/images/$1.png"],
  // Piggy Girl Gang: .../<slug>-json/<addr>.json -> .../<slug>-images/<addr>.png
  [/-json\/([^/]+)\.json$/, "-images/$1.png"],
];

/**
 * Girl Gang's on-chain URI still points at the 2021-era shdw-drive host, which
 * is gone. The asset repo records where each mint's metadata was re-hosted, and
 * that split is exactly the contract's metadataUri (recorded on chain, may be
 * dead) versus metadataSourceUri (the link that still resolves).
 */
function loadRehostMap(slug) {
  const files = REHOST_MAPS[slug] ?? [];
  const map = new Map();
  for (const file of files) {
    const full = path.join(ASSETS, file);
    if (!existsSync(full)) continue;
    for (const row of JSON.parse(readFileSync(full, "utf8"))) {
      map.set(row.mint_account, row.new_uri);
    }
  }
  return map;
}

/** The metadata URI recorded on chain, from the committed metaboss dump. */
function metadataUriOf(nft) {
  const dir = ART_METADATA[nft.collectionSlug];
  if (!dir) return null;
  const dump = path.join(ASSETS, dir, `${nft.address}.json`);
  if (!existsSync(dump)) return null;
  return JSON.parse(readFileSync(dump, "utf8")).uri ?? null;
}

async function imageUriOf(sourceUri, address) {
  for (const [pattern, replacement] of IMAGE_PATH_RULES) {
    const match = pattern.exec(sourceUri);
    if (match && match[1] === address) return sourceUri.replace(pattern, replacement);
  }
  try {
    const metadata = await fetch(sourceUri).then((response) => response.json());
    return metadata.image ?? null;
  } catch {
    return null;
  }
}

/** HEAD every candidate, a few at a time, so imageStatus is observed not assumed. */
async function checkAll(urls) {
  const status = new Map();
  const queue = [...urls];
  const workers = Array.from({ length: 8 }, async () => {
    for (let url = queue.pop(); url !== undefined; url = queue.pop()) {
      try {
        const response = await fetch(url, { method: "HEAD" });
        status.set(url, response.ok ? "ok" : "dead");
      } catch {
        // No network, or a host that refuses HEAD. "unknown" is the contract's
        // own word for "not checked", and the UI loads those optimistically.
        status.set(url, "unknown");
      }
    }
  });
  await Promise.all(workers);
  return status;
}

// Truncated to the hour so a regeneration produces a tidy diff rather than a
// new timestamp on every row.
const NOW = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
const checkedAt = NOW.toISOString();

if (!existsSync(ASSETS)) {
  console.warn(`! ${ASSETS} not found — every fixture keeps imageUri null.`);
} else {
  const rehosts = new Map(SAMPLE.map(({ slug }) => [slug, loadRehostMap(slug)]));
  for (const nft of nfts) {
    const uri = metadataUriOf(nft);
    if (!uri) continue;
    nft.metadataUri = uri;
    nft.metadataSourceUri = rehosts.get(nft.collectionSlug)?.get(nft.address) ?? uri;
    nft.imageUri = await imageUriOf(nft.metadataSourceUri, nft.address);
  }
  const status = await checkAll(new Set(nfts.map((nft) => nft.imageUri).filter(Boolean)));
  for (const nft of nfts) {
    if (!nft.imageUri) continue;
    nft.imageStatus = status.get(nft.imageUri) ?? "unknown";
    nft.imageCheckedAt = nft.imageStatus === "unknown" ? null : checkedAt;
  }
}

// ------------------------------------------------------ deliberate edge cases
//
// Every one of these is a state the real index will contain and the UI has to
// render. Without them the browse grid is N identical happy paths and the
// fallbacks ship implemented but unreviewed.

const withArt = nfts.filter((nft) => nft.imageStatus === "ok");

// A 2021-era link that no longer resolves. imageStatus says so, so the card
// renders the placeholder without ever issuing the request.
const rotted = withArt.at(-1);
if (rotted) {
  rotted.imageUri = DEAD_IMAGE_URL;
  rotted.imageStatus = "dead";
  rotted.imageCheckedAt = checkedAt;
}

// Not yet checked: the contract says load it optimistically, so this one shows
// the image arriving behind the placeholder rather than instead of it.
const unchecked = withArt.at(-2);
if (unchecked) {
  unchecked.imageStatus = "unknown";
  unchecked.imageCheckedAt = null;
}

// Burned. Part of the browse population by contract, greyed rather than hidden,
// and with no owner — a burned asset has none.
for (const { slug } of SAMPLE) {
  const burned = nfts.filter((nft) => nft.collectionSlug === slug).at(-1);
  if (burned) {
    burned.burned = true;
    burned.owner = null;
  }
}

// A name the indexer could not parse a number out of: sorts last under
// sort=number, and the card falls back to the whole name.
const unnumbered = nfts.find((nft) => nft.collectionSlug === "piggy-gang");
if (unnumbered) {
  unnumbered.name = "Genesis Pig";
  unnumbered.number = null;
}

// A Core asset whose update authority moved it out of the collection. Still
// addressable, reports `removed`.
const removed = nfts.filter((nft) => nft.collectionSlug === "piggy-gang").at(-2);
if (removed) {
  removed.membershipStatus = "removed";
  removed.removedAt = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
}

// --------------------------------------------------------------- history
//
// Deterministic, and anchored at generation time so the home strip reads as
// recent activity rather than as an archive. Every asset gets its mint; a
// spread of them get the fuller history the timeline and the strip need.

const SLOT0 = 344_000_000;
const ago = (hours) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
// Solana lands roughly 8,000 slots an hour; the arithmetic only has to be
// monotonic with time, which is what the (slot, id) ordering key needs.
const slotAgo = (hours) => SLOT0 + Math.round((400 * 24 - hours) * 8_000);

const activity = {};
const ownership = {};
let sig = 0;
let eventId = 900_000;

const nextEvent = (kind, hours, extra) => ({
  id: String((eventId += 7)),
  kind,
  signature: sentinelSignature((sig += 1)),
  seq: 0,
  slot: slotAgo(hours),
  blockTime: ago(hours),
  fromOwner: null,
  toOwner: null,
  priceLamports: null,
  marketplace: null,
  ...extra,
});

const interval = (owner, fromHours, toHours, openedBy, closedBy) => ({
  owner,
  fromSlot: slotAgo(fromHours),
  fromTs: ago(fromHours),
  toSlot: toHours === null ? null : slotAgo(toHours),
  toTs: toHours === null ? null : ago(toHours),
  isCurrent: toHours === null,
  openedBySignature: openedBy,
  closedBySignature: closedBy,
});

nfts.forEach((nft, index) => {
  // Mints spread across a year so sort=number and sort=activity disagree, which
  // is the only way an activity sort is reviewable at all.
  const mintedHours = 24 * (365 - ((index * 37) % 365));
  const events = [];
  const intervals = [];
  const mintedTo = nft.owner ?? WALLETS[3];

  const mint = nextEvent("mint", mintedHours, { toOwner: mintedTo });
  events.push(mint);

  const rich = index % 9 === 0;
  const busy = index % 3 === 0;

  if (nft.burned) {
    const burnedHours = Math.max(1, mintedHours - 24 * 30);
    const burn = nextEvent("burn", burnedHours, { fromOwner: mintedTo });
    events.push(burn);
    intervals.push(interval(mintedTo, mintedHours, burnedHours, mint.signature, burn.signature));
  } else if (rich) {
    const midHours = Math.round(mintedHours / 2);
    const recentHours = 1 + (index % 40);
    const via = WALLETS[1 + (index % (WALLETS.length - 1))];
    const transfer = nextEvent("transfer", midHours, { fromOwner: mintedTo, toOwner: via });
    const sale = nextEvent("sale", recentHours, {
      fromOwner: via,
      toOwner: nft.owner,
      // Lamports as a decimal string: the full u64 range round-trips exactly and
      // nobody divides by 1e9 in floating point.
      priceLamports: String(1_250_000_000 + index * 37_000_000),
      marketplace: index % 2 === 0 ? "Tensor" : "Magic Eden",
    });
    events.push(transfer, sale);
    intervals.push(
      interval(nft.owner, recentHours, null, sale.signature, null),
      interval(via, midHours, recentHours, transfer.signature, sale.signature),
      interval(mintedTo, mintedHours, midHours, mint.signature, transfer.signature),
    );
  } else if (busy) {
    const recentHours = 2 + (index % 60);
    const transfer = nextEvent("transfer", recentHours, {
      fromOwner: mintedTo,
      toOwner: nft.owner,
    });
    events.push(transfer);
    intervals.push(
      interval(nft.owner, recentHours, null, transfer.signature, null),
      interval(mintedTo, mintedHours, recentHours, mint.signature, transfer.signature),
    );
  } else {
    intervals.push(interval(nft.owner, mintedHours, null, mint.signature, null));
  }

  // Newest first, per the contract's (slot, id) descending order.
  events.sort((a, b) => b.slot - a.slot);
  activity[nft.address] = events;
  ownership[nft.address] = intervals;
  nft.lastActivityAt = events[0].blockTime;
  nft.updatedAt = checkedAt;
});

// An asset the indexer has classified but never seen move. A null
// lastActivityAt sorts first under sort=activity, per the contract.
const quiet = nfts.filter((nft) => !nft.burned).at(-3);
if (quiet) {
  activity[quiet.address] = [];
  quiet.lastActivityAt = null;
}

// A kind outside the four v1 serves. The contract reserves stake/unstake/other
// and requires clients to render an unrecognised kind as a generic timeline
// entry rather than crash, so exactly one fixture exercises that branch.
const staked = nfts.find(
  (nft) => !nft.burned && activity[nft.address] && activity[nft.address].length === 1,
);
if (staked) {
  activity[staked.address].unshift(
    nextEvent("stake", 6, { fromOwner: staked.owner, toOwner: staked.owner }),
  );
  staked.lastActivityAt = activity[staked.address][0].blockTime;
}

// ------------------------------------------------------------------- stats
//
// Derived from the fixtures rather than copied from the spec's examples. The
// new contract makes CollectionStats.indexed the unfiltered browse count and
// FacetsResponse.total the filtered one, so a headline that disagreed with the
// grid would make the toolbar lie. A reviewer sees the fixture's own supply,
// not the real collection's — internal consistency catches UI bugs and
// verisimilitude catches none.

const hoursSince = (iso) => (NOW.getTime() - Date.parse(iso)) / 3_600_000;

for (const { slug, standard } of SAMPLE) {
  const rows = nfts.filter((nft) => nft.collectionSlug === slug);
  const live = rows.filter((nft) => !nft.burned);
  const owners = new Map();
  for (const nft of live) {
    if (nft.owner) owners.set(nft.owner, (owners.get(nft.owner) ?? 0) + 1);
  }
  const events = rows.flatMap((nft) => activity[nft.address] ?? []);
  const bucket = (label, min, max) => {
    const held = [...owners.values()].filter((n) => n >= min && (max === null || n <= max));
    return {
      label,
      minCount: min,
      maxCount: max,
      holders: held.length,
      assets: held.reduce((total, n) => total + n, 0),
    };
  };
  const times = events.map((event) => event.blockTime).sort();

  collections.push({
    slug,
    name: DISPLAY_NAME[slug],
    standard,
    membershipRule: MEMBERSHIP_RULE[slug],
    address: COLLECTION_ADDRESS[slug],
    symbol: SYMBOL[slug],
    imageUrl: null,
    stats: {
      supply: live.length,
      holders: owners.size,
      burned: rows.length - live.length,
      indexed: rows.length,
      activity24h: events.filter((event) => hoursSince(event.blockTime) <= 24).length,
      activity7d: events.filter((event) => hoursSince(event.blockTime) <= 24 * 7).length,
      lastActivityAt: times.length > 0 ? times[times.length - 1] : null,
      holderDistribution: [bucket("1", 1, 1), bucket("2-5", 2, 5), bucket("6+", 6, null)],
      asOf: checkedAt,
    },
  });
}

// Cheap arithmetic guards. These are the invariants the contract states in
// prose, and a fixture set that broke one would send the UI chasing a bug that
// was never in the UI.
for (const collection of collections) {
  const { supply, burned, indexed, holderDistribution } = collection.stats;
  if (indexed !== supply + burned) {
    throw new Error(`${collection.slug}: indexed must equal supply + burned`);
  }
  const held = holderDistribution.reduce((total, cohort) => total + cohort.assets, 0);
  if (held !== supply) {
    throw new Error(`${collection.slug}: holder cohorts hold ${held}, supply is ${supply}`);
  }
}

// ---------------------------------------------------------------- emit

const banner = `// GENERATED by scripts/gen-fixtures.mjs — do not edit by hand.
// Real mints and trait combinations sampled from the dressme repo's committed
// indexes; owners, signatures, rarity ranks and Core asset ids are synthetic
// sentinels. Stats describe THIS fixture set, not the real collections.
`;

mkdirSync(OUT, { recursive: true });

function emit(file, body) {
  writeFileSync(path.join(OUT, file), banner + body);
  console.log(`wrote lib/api/fixtures/${file}`);
}

const json = (value) => JSON.stringify(value, null, 2);

emit(
  "collections.ts",
  `import type { components } from "@/lib/api/schema";

export const COLLECTIONS = ${json(collections)} satisfies components["schemas"]["Collection"][];
`,
);

emit(
  "nfts.ts",
  `import type { components } from "@/lib/api/schema";

export const DEMO_WALLET = ${json(DEMO_WALLET)};

/**
 * The embedded collection ref is joined in from COLLECTIONS at serve time
 * rather than duplicated on every row, and ownership / mint / activitySummary
 * are derived at serve time from ACTIVITY and OWNERSHIP — so an NFT's detail
 * panel can never disagree with its own timeline.
 */
export const NFTS = ${json(nfts)} satisfies (Omit<
  components["schemas"]["NftDetail"],
  "collection" | "ownership" | "mint" | "activitySummary"
> & { collectionSlug: string })[];
`,
);

emit(
  "activity.ts",
  `import type { components } from "@/lib/api/schema";

export const ACTIVITY = ${json(activity)} satisfies Record<string, components["schemas"]["ActivityEvent"][]>;

export const OWNERSHIP = ${json(ownership)} satisfies Record<string, components["schemas"]["OwnershipInterval"][]>;
`,
);

console.log(
  "%d assets across %d collections; %d with a reachable image",
  nfts.length,
  collections.length,
  nfts.filter((nft) => nft.imageStatus === "ok").length,
);
