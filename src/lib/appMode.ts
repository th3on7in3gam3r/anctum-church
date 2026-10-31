import { CHURCH_PUBLIC_NAME, publicSiteUrl, sanctumMode } from '../../shared/sanctumMode.ts';

export { CHURCH_PUBLIC_NAME };

export function isChurchMode() {
  return sanctumMode(import.meta.env.VITE_SANCTUM_MODE) === 'church';
}

export function churchSiteUrl() {
  return publicSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL);
}

export function leaveToHome(navigate: (path: string) => void) {
  if (isChurchMode()) {
    window.location.assign(churchSiteUrl());
    return;
  }
  navigate('/');
}
