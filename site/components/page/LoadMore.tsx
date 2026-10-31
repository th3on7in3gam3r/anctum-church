import Link from 'next/link';

export function LoadMore({ href, label = 'Load more' }: { href: string; label?: string }) {
  return <Link href={href} className="site-button border border-sand text-on-dark">{label}</Link>;
}
