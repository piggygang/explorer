import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCollection, listCollections } from "@/lib/api/client";
import { toDisplay, withComingSoon } from "@/lib/collections";

export const revalidate = 300;

export async function generateMetadata(
  props: PageProps<"/collections/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await getCollection(slug);
  return { title: collection?.name ?? "Unknown collection" };
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="font-mono text-xl">{children}</dd>
    </div>
  );
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const { slug } = await props.params;
  const [all, collection] = await Promise.all([listCollections(), getCollection(slug)]);
  if (!collection) notFound();

  const collections = withComingSoon(all.map(toDisplay));
  const display = toDisplay(collection);
  const number = (value: number) => value.toLocaleString("en-US");

  return (
    <>
      <SiteHeader collections={collections} activeSlug={slug} />

      <main className="flex-1">
        <section
          style={{ "--accent": display.accent } as CSSProperties}
          className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16"
        >
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {display.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{display.tagline}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-card border border-line bg-surface p-4 sm:grid-cols-4 sm:p-5">
            <Stat label="Supply">{number(collection.stats.supply)}</Stat>
            <Stat label="Holders">{number(collection.stats.holders)}</Stat>
            <Stat label="24h activity">{number(collection.stats.activity24h)}</Stat>
            <Stat label="7d activity">{number(collection.stats.activity7d)}</Stat>
          </dl>

          <div className="mt-4 rounded-card border border-dashed border-line bg-surface/50 p-6 text-sm text-ink-muted">
            The full piggy grid — trait filters, search and rarity — lands with
            the faceted-search milestone.
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
