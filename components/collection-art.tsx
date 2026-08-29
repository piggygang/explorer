import { CoverArt, PiggyArt } from "@/components/piggy-art";
import type { Artwork } from "@/lib/collections";

export function CollectionArt({
  art,
  alt,
  className,
  eager,
}: {
  art: Artwork;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return art.kind === "layers" ? (
    <PiggyArt layers={art.layers} alt={alt} className={className} eager={eager} />
  ) : (
    <CoverArt src={art.src} alt={alt} className={className} eager={eager} />
  );
}
