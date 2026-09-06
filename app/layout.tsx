import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE.name,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Body is a flex column whose FLEX ITEMS must stay the header, main and
          footer — pages render all three themselves. SiteHeader also emits the
          search palette as a fourth child, which is never one: a closed <dialog>
          is display:none and an open modal one is position:fixed in the top
          layer, so neither takes part in this column. */}
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
