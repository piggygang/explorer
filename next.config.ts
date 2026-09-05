import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The two hosts the collections' media was re-hosted to after their 2021
    // hosts went away. Pinned exactly rather than as `**.r2.dev`, which would
    // let anyone route an arbitrary bucket through this app's image optimizer.
    //
    // A src outside this list is a hard 400 from next/image, not a graceful
    // miss, so components/nft-image.tsx checks the hostname first and falls
    // back to a plain <img> — which is also what carries `ipfs://` and `ar://`,
    // the URI schemes the contract warns 2021 metadata still contains. The two
    // lists must stay in step.
    remotePatterns: [
      new URL("https://pub-b1a45763f0a64d8fa271f66f5514a561.r2.dev/**"),
      new URL("https://rk2cjjujjgvqwsmy.public.blob.vercel-storage.com/**"),
    ],
  },
  async headers() {
    return [
      {
        // Art filenames under /piggy are content-stable — a re-exported layer
        // or cover gets a new name. Next serves /public with max-age=0.
        source: "/piggy/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
