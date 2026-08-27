export const SITE = {
  name: "Piggy Explorer",
  tagline: "Every piggy in the gang, one search away.",
} as const;

export type Social = {
  label: string;
  href: string;
  /** Key into ICONS in components/site-footer.tsx */
  icon: "x" | "discord" | "github";
};

// Mirrors ../website/lib/site.ts — the org's current links (dressme's
// twitter.com URL and Discord invite are stale).
export const SOCIALS: Social[] = [
  { label: "X", href: "https://x.com/PiggySolGang", icon: "x" },
  { label: "Discord", href: "https://discord.gg/8SjGR8Srvz", icon: "discord" },
  { label: "GitHub", href: "https://github.com/piggygang", icon: "github" },
];
