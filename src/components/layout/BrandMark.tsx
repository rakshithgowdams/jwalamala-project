import Image from "next/image";

/**
 * Fixed site emblem path. Never read CMS/env URLs here — a published article
 * cover must not replace the masthead mark.
 */
export const BRAND_MARK_SRC = "/images/jwalamala-logo.jpg" as const;

/** Circular Jwalamala emblem for the public header and footer. */
export function BrandMark({
  size,
  alt,
  priority = false,
  className,
}: {
  size: number;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      className={className}
      src={BRAND_MARK_SRC}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      // Keep the file bytes as-is so the optimizer never mixes this with post covers.
      unoptimized
    />
  );
}
