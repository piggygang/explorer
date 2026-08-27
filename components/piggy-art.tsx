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
          className="absolute inset-0 h-full w-full select-none"
        />
      ))}
    </div>
  );
}
