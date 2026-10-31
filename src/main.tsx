import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ClerkProvider} from '@clerk/react';
import App from './App.tsx';
import './index.css';
import './tour/tour.css';
import {registerSanctumServiceWorker} from './pwa.ts';
import {churchSiteUrl, isChurchMode} from './lib/appMode.ts';
import './sentry.ts';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
registerSanctumServiceWorker();

const tree = (
  <StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl={isChurchMode() ? churchSiteUrl() : '/'} signInFallbackRedirectUrl="/onboarding">
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(tree);
