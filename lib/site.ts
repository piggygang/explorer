export const SITE = {
  name: "Piggy Explorer",
  tagline: "Every piggy in the gang, one search away.",
} as const;

export type Social = {
  label: string;
  href: string;
  /** Key into ICONS in components/site-footer.tsx */
  icon: "x" | "discord" | "marketplace";
};

export const SOCIALS: Social[] = [
  { label: "X", href: "https://twitter.com/PiggySolGang", icon: "x" },
  { label: "Discord", href: "https://discord.gg/QyUHFsZnuJ", icon: "discord" },
  { label: "piggygang.com", href: "https://piggygang.com/", icon: "marketplace" },
];
