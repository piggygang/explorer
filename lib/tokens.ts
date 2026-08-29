export type Token = {
  name: string;
  /** Ticker including the $, rendered in font-mono. */
  symbol: string;
  blurb: string;
  /** Square PNG, transparent around the coin. */
  logo: string;
  /** Set as --accent on the card. */
  accent: string;
  /** The label is data: the destination may be a swap, a chart or an explorer. */
  link?: { label: string; href: string };
};

export const TOKENS: Token[] = [
  {
    name: "Piggy Token",
    symbol: "$PIGGY",
    // Placeholder until the ALG-641 copy doc is approved.
    blurb: "The gang’s coin, on Solana.",
    logo: "/piggy/tokens/piggy.png",
    accent: "var(--gold)",
    link: {
      label: "View on Solscan",
      href: "https://solscan.io/token/FUtxQAXuC4TgQvF7C5RTRsgqHvPqn4iHhMicRZKV775E",
    },
  },
];
