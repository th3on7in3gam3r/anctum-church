import { GlowPhoto } from '@/components/GlowPhoto';

export function PhotoTile({
  src,
  alt = '',
  className = '',
  sizes,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  sizes: string;
}) {
  return <GlowPhoto src={src} alt={alt} sizes={sizes} className={className} />;
}
