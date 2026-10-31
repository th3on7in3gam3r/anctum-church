import { brandTheme } from '../../shared/churchSetup.ts';

const STYLE_ID = 'church-brand-theme';

/**
 * Re-colors the staff app with the church's chosen theme. A late <style> beats the
 * defaults in index.css at equal specificity and keeps light and dusk modes separate.
 */
export function applyBrandTheme(key: string | undefined): void {
  if (typeof document === 'undefined') return;
  const theme = brandTheme(key);
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = `:root{--deep-green:${theme.primary};--warm-gold:${theme.accent};--soft-gold:${theme.accentSoft};` +
    `--brand-primary:${theme.primary};--brand-primary-dusk:${theme.primaryDark};--brand-accent:${theme.accent};` +
    `--brand-dusk-bg:${theme.duskBg};--brand-dusk-card:${theme.duskCard};}` +
    `.dark{--deep-green:${theme.primaryDark};--warm-gold:${theme.accent};--soft-gold:#4A4436;}`;
}
