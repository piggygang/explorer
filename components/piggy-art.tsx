/**
 * The two ways art reaches the page — DressMe trait layers stacked in paint
 * order, or a single cover image — sharing one square box contract.
 */

const IMG = "absolute inset-0 h-full w-full select-none";

/**
 * The composed piggy: pre-resolved trait layers stacked in paint order.
 * Layers arrive as fixed src lists (lib/collections.ts), so unlike DressMe's
 * editor there is nothing to resolve or re-key at runtime.
 */
export function PiggyArt({
  layers,
  alt,
  className,
  eager = false,
}: {
  layers: string[];
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative isolate aspect-square overflow-hidden ${className ?? ""}`}
    >
      {layers.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          width={256}
          height={256}
          draggable={false}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className={IMG}
        />
      ))}
    </div>
  );
}

/** One cover image filling the square. */
export function CoverArt({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden ${className ?? ""}`}>
      <img
        src={src}
        alt={alt}
        width={256}
        height={256}
        draggable={false}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={`${IMG} object-cover`}
      />
    </div>
  );
}
