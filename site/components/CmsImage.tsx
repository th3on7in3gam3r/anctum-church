import Image from 'next/image';

export function CmsImage({
  src,
  alt,
  priority = false,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes: string;
}) {
  if (!src.startsWith('https://')) {
    return (
      // CMS may store a same-origin path. The optimizer only fetches https hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} />
    );
  }

  return (
    <span className="relative block aspect-[16/9] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={className || 'object-cover'}
      />
    </span>
  );
}
