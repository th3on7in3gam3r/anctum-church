import Image from 'next/image';

export function GlowPhoto({
  src,
  alt,
  className,
  priority = false,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <div className={`glow-tile relative overflow-hidden ${className || ''}`}>
      {src ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
      ) : null}
    </div>
  );
}
