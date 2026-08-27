import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCollections } from "@/lib/api/client";
import { toDisplay } from "@/lib/collections";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const raw = searchParams.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  const collections = (await listCollections()).map(toDisplay);

  return (
    <>
      <SiteHeader collections={collections} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {query ? (
              <>
                Search for <span className="text-brand">“{query}”</span>
              </>
            ) : (
              "Search"
            )}
          </h1>

          <div className="mt-6 rounded-card border border-dashed border-line bg-surface/50 p-6 text-sm text-ink-muted">
            Search across every piggy — by name, #number or mint — ships with a
            later milestone. Browse a collection from the header meanwhile.
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
