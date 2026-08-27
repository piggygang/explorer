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

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRESSME = path.resolve(HERE, "../../dressme");
const OUT = path.resolve(HERE, "../lib/api/fixtures");

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
