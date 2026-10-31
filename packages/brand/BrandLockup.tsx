import { BRAND } from './brand.ts';

const MARK = {
  sm: 32,
  md: 44,
  lg: 64,
} as const;

export function BrandLockup({
  size = 'md',
  variant = 'full',
  href,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
  href?: string;
  className?: string;
}) {
  const px = MARK[size];
  const classNames = ['brand-lockup', className].filter(Boolean).join(' ');
  const inner = (
    <>
      <img
        src={`/brand/${BRAND.mark}`}
        srcSet={`/brand/plcc-mark@2x.png 2x`}
        alt=""
        width={px}
        height={px}
        className="brand-mark"
      />
      {variant === 'full' ? (
        <span className="brand-words">
          <span className="brand-name">{BRAND.name}</span>
          <span className="brand-sub">{BRAND.subline}</span>
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <a className={classNames} data-size={size} data-variant={variant} href={href} aria-label={`${BRAND.fullName} — home`}>
        {inner}
      </a>
    );
  }
  return (
    <div className={classNames} data-size={size} data-variant={variant}>
      {inner}
    </div>
  );
}
