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

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRESSME = path.resolve(HERE, "../../dressme");
const OUT = path.resolve(HERE, "../lib/api/fixtures");

// The sibling asset repo holds the real per-mint art. It is optional: without
// it every fixture keeps imageUrl null, which is what the API returns today
// anyway — the prototype just becomes much harder to review.
const ASSETS = path.resolve(HERE, "../../assets");
const ART_DIR = path.resolve(HERE, "../public/piggy/nft");
const ART_URL = "/piggy/nft";
const ART_SOURCE = {
  "piggy-sol-gang": "piggy-sol-gang-images",
  "piggy-girl-gang": "piggy-girl-gang-images",
};
// Most of piggy-sol-gang-images is 0-byte placeholders, but the committed
// metaboss dumps carry each mint's metadata URI, and that re-host serves the
// art. So: local bytes when they exist, the re-host when they do not.
const ART_METADATA = {
  "piggy-sol-gang": "piggy-sol-gang-metaboss-full",
  "piggy-girl-gang": "piggy-girl-gang-metaboss-full",
};
// One fixture points at a host that will never answer, so the card's onError
// fallback is visible in review rather than merely implemented.
const DEAD_IMAGE_URL = "https://arweave.net/this-link-rotted-in-2021.png";

// Mirrors dressme lib/collections.ts — the wire alphabet of look codes.
const LOOK_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

// How many sample tokens per collection. 30 for the first collection so the
// default page size (24) has a real second page to serve.
const SAMPLE = [
  { slug: "piggy-sol-gang", count: 30, standard: "token_metadata" },
  { slug: "piggy-girl-gang", count: 10, standard: "token_metadata" },
  { slug: "piggy-gang", count: 6, standard: "core" },
];

// Presentation-free stats, matching the examples embedded in openapi/v1.yaml
// so `prism mock` and the in-app mock tell the same story.
const STATS = {
  "piggy-sol-gang": { holders: 2914, activity24h: 12, activity7d: 87 },
  "piggy-girl-gang": { holders: 1408, activity24h: 5, activity7d: 41 },
  "piggy-gang": { holders: 3120, activity24h: 18, activity7d: 122 },
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

  collections.push({
    slug,
    name: DISPLAY_NAME[slug],
    standard,
    address: COLLECTION_ADDRESS[slug],
    imageUrl: null,
    stats: { supply: manifest.supply, ...STATS[slug] },
  });

  for (let n = 0; n < count; n += 1) {
    const id = tokens.firstId + n;
    nfts.push({
      id: mints ? mintAt(mints, id) : sentinelCoreId(id),
      collectionSlug: slug,
      // Core assets are named "#N" on chain; the minted collections carry
      // their collection name.
      name: standard === "core" ? `#${id}` : `${DISPLAY_NAME[slug]} #${id}`,
      number: id,
      // Filled in by the art pass below, once the mint ids are known.
      imageUrl: null,
      burned: false,
      standard,
      metadataUri: null,
      // The demo wallet owns the first two of each collection; the rest
      // rotate through the sentinel holders.
      owner: n < 2 ? DEMO_WALLET : WALLETS[1 + (n % (WALLETS.length - 1))],
      attributes: attributesAt(manifest, tokens, id),
    });
  }
}

// ------------------------------------------------------------------ art pass
//
// The contract says imageUrl is null on every NFT, and it will stay null until
// media ingestion lands. That is honest but unreviewable: a browse grid of 24
// identical brand marks tells nobody whether the design works.
//
// So the mock runs ahead of production ingestion here, exactly as it already
// does for activity and ownership: the 40 token_metadata fixtures are real
// mints whose art already exists in ../assets, so it is downsized into
// public/piggy/nft/ and pointed at. The 6 Core fixtures have sentinel ids and
// no art, so they keep imageUrl null and demonstrate that path for free, and
// one real fixture is pointed at a dead host to exercise the onError fallback.

/** Local bytes if there are any, else the metadata's own image URL. */
async function artInput(nft) {
  const dir = ART_SOURCE[nft.collectionSlug];
  if (!dir) return null;

  const local = path.join(ASSETS, dir, `${nft.id}.png`);
  if (existsSync(local) && statSync(local).size > 0) return local;

  const dump = path.join(ASSETS, ART_METADATA[nft.collectionSlug] ?? "", `${nft.id}.json`);
  if (!existsSync(dump)) return null;
  const { uri } = JSON.parse(readFileSync(dump, "utf8"));
  if (!uri) return null;

  try {
    const metadata = await fetch(uri).then((response) => response.json());
    if (!metadata.image) return null;
    const image = await fetch(metadata.image);
    if (!image.ok) return null;
    return Buffer.from(await image.arrayBuffer());
  } catch {
    // A dead re-host is not a build failure — that NFT keeps imageUrl null,
    // which is exactly what the API returns for it today.
    return null;
  }
}

async function writeArt() {
  if (!existsSync(ASSETS)) {
    console.warn(`! ${ASSETS} not found — every fixture keeps imageUrl null.`);
    return 0;
  }

  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.warn("! sharp is not installed — every fixture keeps imageUrl null.");
    return 0;
  }

  // Rebuilt wholesale so a shrunk SAMPLE never leaves orphans behind.
  rmSync(ART_DIR, { recursive: true, force: true });
  mkdirSync(ART_DIR, { recursive: true });

  let written = 0;
  for (const nft of nfts) {
    const input = await artInput(nft);
    if (!input) continue;
    // 640px covers the detail hero at 2x on a phone and a grid cell at 2x on a
    // desktop; the sources are 1080px, more than any layout here asks for.
    await sharp(input)
      .resize(640, 640, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(path.join(ART_DIR, `${nft.id}.webp`));
    nft.imageUrl = `${ART_URL}/${nft.id}.webp`;
    written += 1;
  }

  // Deliberately break the last one: a 2021-era link that no longer resolves is
  // the single most likely real-world state, and it must be visible in review.
  const dead = [...nfts].reverse().find((nft) => nft.imageUrl !== null);
  if (dead) dead.imageUrl = DEAD_IMAGE_URL;

  return written;
}

const artCount = await writeArt();

// Deterministic on-chain history. Every NFT gets its mint event; the first of
// each collection also gets a transfer and a sale, and a two-owner history.
const T0 = Date.parse("2026-06-01T00:00:00Z");
const SLOT0 = 344_000_000;
const at = (day) => new Date(T0 + day * 86_400_000).toISOString();
const slotAt = (day) => SLOT0 + day * 200_000;

const activity = {};
const ownership = {};
let sig = 0;

for (const nft of nfts) {
  const first = nfts.find((n) => n.collectionSlug === nft.collectionSlug) === nft;
  const events = [
    {
      type: "mint",
      signature: sentinelSignature((sig += 1)),
      slot: slotAt(0),
      timestamp: at(0),
      from: null,
      to: first ? WALLETS[3] : nft.owner,
      priceLamports: null,
      marketplace: null,
    },
  ];
  if (first) {
    events.push(
      {
        type: "transfer",
        signature: sentinelSignature((sig += 1)),
        slot: slotAt(30),
        timestamp: at(30),
        from: WALLETS[3],
        to: WALLETS[4],
        priceLamports: null,
        marketplace: null,
      },
      {
        type: "sale",
        signature: sentinelSignature((sig += 1)),
        slot: slotAt(60),
        timestamp: at(60),
        from: WALLETS[4],
        to: nft.owner,
        priceLamports: 2_500_000_000,
        marketplace: "Magic Eden",
      },
    );
    ownership[nft.id] = [
      {
        owner: nft.owner,
        fromSlot: slotAt(60),
        fromTimestamp: at(60),
        toSlot: null,
        toTimestamp: null,
      },
      {
        owner: WALLETS[4],
        fromSlot: slotAt(30),
        fromTimestamp: at(30),
        toSlot: slotAt(60),
        toTimestamp: at(60),
      },
      {
        owner: WALLETS[3],
        fromSlot: slotAt(0),
        fromTimestamp: at(0),
        toSlot: slotAt(30),
        toTimestamp: at(30),
      },
    ];
  } else {
    ownership[nft.id] = [
      {
        owner: nft.owner,
        fromSlot: slotAt(0),
        fromTimestamp: at(0),
        toSlot: null,
        toTimestamp: null,
      },
    ];
  }
  // Newest first, per the contract.
  activity[nft.id] = events.reverse();
}

// ---------------------------------------------------------------- emit

const banner = `// GENERATED by scripts/gen-fixtures.mjs — do not edit by hand.
// Real mints and trait combinations sampled from the dressme repo's committed
// indexes; owners, signatures and Core asset ids are synthetic sentinels.
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

export const COLLECTIONS = ${json(collections)} satisfies components["schemas"]["CollectionWithStats"][];
`,
);

emit(
  "nfts.ts",
  `import type { components } from "@/lib/api/schema";

export const DEMO_WALLET = ${json(DEMO_WALLET)};

// The embedded collection object is joined in from COLLECTIONS at serve time
// rather than duplicated 46 times here.
export const NFTS = ${json(nfts)} satisfies Omit<components["schemas"]["NftDetail"], "collection">[];
`,
);

emit(
  "activity.ts",
  `import type { components } from "@/lib/api/schema";

export const ACTIVITY = ${json(activity)} satisfies Record<string, components["schemas"]["ActivityEvent"][]>;

export const OWNERSHIP = ${json(ownership)} satisfies Record<string, components["schemas"]["OwnershipRecord"][]>;
`,
);

console.log(`wrote %s demo art files to public/piggy/nft`, artCount);
