# Staging deployment

Logo is owned by `packages/brand`. Imports never touch the logo. The public mark is the circle plus the Fraunces wordmark from `BrandLockup`. Do not replace it with an image that has baked-in text.

The public site (`site/`) deploys to Vercel. Sanctum and the API deploy to one Render web service: `npm start` serves the Vite build and `/api`. Postgres is Render or Neon, using a pooled URL. LiveKit Cloud stays on its current project. Images stay on Cloudinary.

`packages/brand` is the package `@plcc/brand`. The site depends on `file:../packages/brand`. The API and Vite app depend on `file:./packages/brand`. Both CSS entry files import `@plcc/brand/tokens.css`. Vercel must use this repository as the Git connection and `site` as the Root Directory, so `packages/` is on disk when `npm ci` runs inside `site/`.

## Environment

Leave `DEPLOY_ENV` unset on a laptop. Set it to `staging` or `production` on the hosts. The API exits at boot when a required value is missing, when `DATABASE_URL` has no `connection_limit` or `pool_timeout`, when a production origin is localhost, or when `ALLOW_PLACEHOLDER=true` under `DEPLOY_ENV=production`. It prints the list. Email and Sentry log once and stay off when their variables are empty.

`/api/public` echoes `Access-Control-Allow-Origin` only for an origin listed in `PUBLIC_SITE_ORIGINS`. When `NODE_ENV=production` (Render) or `DEPLOY_ENV=production`, localhost and `127.0.0.1` are dropped even if they are listed.

| Name | Required | App | Purpose |
| --- | --- | --- | --- |
| `DEPLOY_ENV` | yes, on a host | Render, Vercel | `staging` or `production`. Staging sends `noindex` and may set `ALLOW_PLACEHOLDER`. |
| `DATABASE_URL` | yes | Render | Pooled Postgres URL. Include `connection_limit=10&pool_timeout=20`. |
| `PUBLIC_SITE_ORIGINS` | yes | Render | Comma-separated site origins for CORS. |
| `PUBLIC_SITE_URL` | yes | Render | Church website. Sanctum `GET /` redirects here. |
| `APP_URL` | yes | Render | Public Sanctum origin, `https://app.<domain>` or `https://app-staging.<domain>`. |
| `SANCTUM_APP_URL` | yes | Vercel | Same origin as `APP_URL`. |
| `NEXT_PUBLIC_API_URL` | yes | Vercel | Render origin, no trailing slash. Same host as `APP_URL`. |
| `ORG_SLUG` | yes | Vercel | `promised-land-christian-center`. |
| `SITE_URL` | yes | Vercel | Public site origin, `https://www.<domain>` or `https://staging.<domain>`. |
| `REVALIDATE_SECRET` | yes | Render, Vercel | Shared secret for `POST /api/revalidate`. |
| `SITE_REVALIDATE_URL` | yes | Render | `https://<site>/api/revalidate`. |
| `CRON_SECRET` | yes | Render | Header `x-cron-secret` on `POST /api/cron/youtube-import`. |
| `CLOUDINARY_CLOUD_NAME` | yes | Render | Gallery uploads. |
| `CLOUDINARY_API_KEY` | yes | Render | Gallery uploads. |
| `CLOUDINARY_API_SECRET` | yes | Render | Gallery uploads. Server only. |
| `LIVEKIT_URL` | yes | Render | Existing LiveKit Cloud WebSocket URL. |
| `LIVEKIT_API_KEY` | yes | Render | LiveKit key. Server only. |
| `LIVEKIT_API_SECRET` | yes | Render | LiveKit secret. Server only. |
| `CLERK_PUBLISHABLE_KEY` | yes | Render | Clerk publishable key. |
| `CLERK_SECRET_KEY` | yes | Render | Clerk secret. Server only. |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes | Render | Same publishable key, inlined into the Sanctum bundle. |
| `SANCTUM_MODE` | no | Render | `church` (the blueprint default). `product` keeps the marketing home. |
| `RESEND_API_KEY` | no | Render | Gallery review email. Off until this and the from-address are set. |
| `GALLERY_REVIEW_FROM` | no | Render | From address, `Promised Land <media@domain>`. |
| `SENTRY_DSN` | no | Render, Vercel | API and Next.js server DSN. |
| `VITE_SENTRY_DSN` | no | Render | Sanctum browser DSN. |
| `NEXT_PUBLIC_SENTRY_DSN` | no | Vercel | Public site browser DSN. |
| `SENTRY_AUTH_TOKEN` | no | Render, Vercel | Uploads source maps during build. |
| `SENTRY_ORG` | no | Render, Vercel | Sentry organization slug. |
| `SENTRY_PROJECT_API` | no | Render | API project slug. |
| `SENTRY_PROJECT_SANCTUM` | no | Render | Sanctum project slug. |
| `SENTRY_PROJECT_SITE` | no | Vercel | Site project slug. |
| `ALLOW_PLACEHOLDER` | staging only | Render | `true` on staging. A production build fails while published rows still have `isPlaceholder=true`, and fails immediately if this is set. |
| `PRAYER_ROOM_SLUG` | no | Vercel | Defaults to `ORG_SLUG`. |

## Builds

Render runs `npm ci && npm run build`, then `npx prisma migrate deploy`, then `npm start`. `NPM_CONFIG_PRODUCTION=false` keeps the Prisma CLI and esbuild installed while `NODE_ENV` stays `production`. The build writes the Vite client and `dist/server.mjs`. Requests under `/join/`, `/dashboard/`, and `/login` fall through to `index.html`. Requests for `.map` files return 404. Hidden source maps are uploaded when the Sentry token and project slugs are present, then removed from `dist`. The release name is `RENDER_GIT_COMMIT`.

The root build also scans `dist` and fails if it contains `Miracle Center`, `Pastor Kenneth`, or `[PLACEHOLDER]`. The site build scans `.next`. The placeholder database check runs only when `DEPLOY_ENV` is set. Staging sets `ALLOW_PLACEHOLDER=true` so sample rows do not block that build. Production leaves the flag unset.

Vercel, with Root Directory `site`, runs `npm ci` and `npm run build` in `site/`. `@plcc/brand` resolves from `../packages/brand`. The Next.js release name is `VERCEL_GIT_COMMIT_SHA`.

## Render

`render.yaml` defines:

- Postgres database `sanctum-postgres`
- Web service `sanctum` (`npm ci && npm run build`, pre-deploy `npx prisma migrate deploy`, `npm start`, health check `/api/health`)
- Cron `youtube-import` every 6 hours: `POST $APP_URL/api/cron/youtube-import` with header `x-cron-secret`

The blueprint database URL is the direct Render string. Before the first successful boot, edit `DATABASE_URL` so it is the pooled URL and includes `connection_limit=10&pool_timeout=20`. A Neon pooled host looks like `ep-….pooler.region.aws.neon.tech`. A Render URL can keep its host and add the two query parameters.

Sanctum responses set `Permissions-Policy: camera=(self), microphone=(self)` so prayer audio, and a later camera phase, can run on `app.<domain>`. The public site sets `camera=(), microphone=()`. When `DEPLOY_ENV=staging`, both apps send `X-Robots-Tag: noindex, nofollow` and `robots.txt` disallows every path.

## Vercel

`site/vercel.json` sets `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy: camera=(), microphone=()`. `site/middleware.ts` sets the Content Security Policy. It allows this site, `youtube-nocookie.com`, `i.ytimg.com`, `res.cloudinary.com`, TikTok embed and CDN hosts, Sentry ingest, Google Fonts, and the API origin from `NEXT_PUBLIC_API_URL`.

## Clerk

Clerk runs on Sanctum, not on the public site. In the Clerk dashboard for the staging instance, open **Configure → Domains**, or **Configure → Developers → Allowed origins** and **Paths / Redirect URLs**, and add every Sanctum origin you will use. Paste the platform URL first, then the custom host after DNS:

Allowed origins:

```
https://sanctum.onrender.com
https://app-staging.<domain>
```

Redirect URLs, one per line:

```
https://sanctum.onrender.com/login
https://sanctum.onrender.com/
https://app-staging.<domain>/login
https://app-staging.<domain>/
```

Use the real Render hostname if it is not `sanctum.onrender.com`. Sign-in and sign-up both use `/login`. After a custom domain is attached, remove the `onrender.com` lines only when you no longer open staff sign-in on that host.

## LiveKit, Cloudinary, Resend

LiveKit Cloud stays on the current project. In that project’s settings, set the webhook URL to `https://<sanctum-origin>/api/livekit/webhooks`. Add the same `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to Render and to the GitHub Actions secrets so the contrast check can open a room.

Cloudinary uses the existing cloud. Paste `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` into Render. No new upload preset is required; the API signs uploads itself.

Resend is optional. When you turn gallery review email on, verify the sending domain and set `RESEND_API_KEY` and `GALLERY_REVIEW_FROM`.

## Smoke test

```bash
BASE_SITE=https://staging.<domain> BASE_APP=https://app-staging.<domain> STAFF_TOKEN='<clerk session>' npm run smoke
```

`STAFF_TOKEN` is a Clerk session token for a staff member. `SMOKE_STAFF_TOKEN` is accepted as the same value. Set `SMOKE_ORG_ID` when that person belongs to more than one church. The script checks every public route for HTTP 200, a home document under 300 KB, a rendered `/gallery`, `/join/<slug>` containing the church name, `/api/health`, `/api/health/db`, and a public `/api/public/<slug>/live` body with no email, phone, or account fields. It also rejects `[PLACEHOLDER]`, `Miracle Center`, and `Pastor Kenneth`.

## Monitoring

Create three Sentry projects: `plcc-site`, `sanctum-web`, and `sanctum-api`. Put each DSN in the variable from the table. Create an auth token that can upload source maps and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and the project slug for that build. The release on each event is the git SHA (`RENDER_GIT_COMMIT` or `VERCEL_GIT_COMMIT_SHA`).

Add an UptimeRobot monitor (or another uptime check) on `https://app-staging.<domain>/api/health` every 5 minutes. A healthy body has `ok: true` and `database: "configured"`. Alert when the status is not 200.

## DNS

Use the platform hostnames until both deploys are green, then attach:

| Host | Type | Value |
| --- | --- | --- |
| `staging` | CNAME | The Vercel target shown after the project is imported |
| `www` | CNAME | The same Vercel target, for production later |
| `app-staging` | CNAME | The Render service hostname, `<service>.onrender.com` |
| `app` | CNAME | The production Render hostname, when you add that service |

Attach the hostnames in Vercel and Render before changing the env origins, so the certificates finish first. Then set Render `APP_URL`, `PUBLIC_SITE_URL`, `PUBLIC_SITE_ORIGINS`, and `SITE_REVALIDATE_URL`, and Vercel `SANCTUM_APP_URL`, `NEXT_PUBLIC_API_URL`, and `SITE_URL`, to the `https://` origins and redeploy both.

## Rollback

On Render, open the service, choose a previous successful deploy, and roll back. The database is not rolled back with the code. Ship a new migration to correct a bad one. Do not drop the Render database. On Vercel, promote the previous deployment. After either rollback, run the smoke command again.

## Rotating secrets

Set the new value on the host that uses it, then redeploy that host. Rotate `REVALIDATE_SECRET` on Render and Vercel together, and `CRON_SECRET` on the web service (the cron reads it from the service). Rotate `CLERK_SECRET_KEY`, `LIVEKIT_API_SECRET`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, and `SENTRY_AUTH_TOKEN` on Render, and the Sentry token on Vercel. Remove the old key from the provider after the new deploy is healthy.

## Backups

On Render, open the Postgres instance, then **Recovery**. Daily backups are available on the paid database plan used by the blueprint. Keep them enabled. To restore: choose a backup or a point in time, restore into a new database, copy that database’s pooled connection string, append `connection_limit=10&pool_timeout=20`, paste it into the web service `DATABASE_URL`, and redeploy. Confirm `/api/health` reports `database: "configured"` before you delete the old instance. On Neon, use the branch or point-in-time restore in the Neon console, then paste the new pooled URL the same way.

## Manual steps

Do these in order. Replace `<domain>` with the real domain. Use the platform URL until that step’s custom host exists.

1. **Render.** New → Blueprint → connect this repository → apply `render.yaml`. Name the web service `sanctum`. Open the service → Environment and paste:

```
DEPLOY_ENV=staging
ALLOW_PLACEHOLDER=true
SANCTUM_MODE=church
DATABASE_URL=<pooled URL>?sslmode=require&connection_limit=10&pool_timeout=20
PUBLIC_SITE_ORIGINS=https://<the Vercel URL you will get in step 5>
PUBLIC_SITE_URL=https://<the same Vercel URL>
APP_URL=https://<service>.onrender.com
SITE_REVALIDATE_URL=https://<the same Vercel URL>/api/revalidate
REVALIDATE_SECRET=<a long random string>
CRON_SECRET=<a different long random string>
LIVEKIT_URL=<wss://…livekit.cloud from the current project>
LIVEKIT_API_KEY=<current LiveKit key>
LIVEKIT_API_SECRET=<current LiveKit secret>
CLERK_PUBLISHABLE_KEY=<pk_test_…>
CLERK_SECRET_KEY=<sk_test_…>
VITE_CLERK_PUBLISHABLE_KEY=<the same pk_test_…>
CLOUDINARY_CLOUD_NAME=<existing cloud name>
CLOUDINARY_API_KEY=<existing API key>
CLOUDINARY_API_SECRET=<existing API secret>
```

Leave `RESEND_API_KEY`, `GALLERY_REVIEW_FROM`, and the Sentry variables empty until those accounts exist. If the blueprint already filled `DATABASE_URL`, replace that value with the line above. Deploy and wait until `https://<service>.onrender.com/api/health` returns `"ok": true` and `"database": "configured"`.

2. **Clerk.** Dashboard → the staging application → Configure → Domains (allowed origins) and Paths (redirect URLs). Paste:

```
https://<service>.onrender.com
https://app-staging.<domain>
```

Redirect URLs:

```
https://<service>.onrender.com/login
https://<service>.onrender.com/
https://app-staging.<domain>/login
https://app-staging.<domain>/
```

Copy the publishable key into both Clerk lines in step 1, and the secret into `CLERK_SECRET_KEY`. Save in Render if you change them, then redeploy.

3. **LiveKit.** In the current LiveKit Cloud project → Settings → Webhooks, paste:

```
https://<service>.onrender.com/api/livekit/webhooks
```

After DNS, add `https://app-staging.<domain>/api/livekit/webhooks` as well. In GitHub → this repository → Settings → Secrets and variables → Actions, create `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` with the same three values as Render. The contrast job on each push uses them.

4. **Cloudinary.** Cloudinary console → the existing cloud → API Keys. Paste the cloud name, API key, and API secret into the three `CLOUDINARY_*` lines on the Render service from step 1. Do not create a new cloud for staging unless you want uploads kept apart from production.

5. **Vercel.** Add New → Project → this repository. Root Directory: `site`. Framework: Next.js. Leave the install and build commands empty. Environment variables for Preview and Production of this staging project:

```
DEPLOY_ENV=staging
NEXT_PUBLIC_API_URL=https://<service>.onrender.com
SANCTUM_APP_URL=https://<service>.onrender.com
ORG_SLUG=promised-land-christian-center
REVALIDATE_SECRET=<the same string as Render>
SITE_URL=https://<the Vercel URL, then https://staging.<domain> after DNS>
```

Deploy. Copy the `https://….vercel.app` URL back into Render `PUBLIC_SITE_ORIGINS`, `PUBLIC_SITE_URL`, and `SITE_REVALIDATE_URL` (that last one plus `/api/revalidate`). Redeploy Render.

6. **DNS.** At the DNS host, add:

```
staging      CNAME   <the Vercel domain target>
app-staging  CNAME   <service>.onrender.com
```

In Vercel → Domains, add `staging.<domain>`. In Render → the service → Custom Domains, add `app-staging.<domain>`. Wait until both certificates are active. Then paste the final origins and redeploy both:

Render:

```
PUBLIC_SITE_ORIGINS=https://staging.<domain>
PUBLIC_SITE_URL=https://staging.<domain>
APP_URL=https://app-staging.<domain>
SITE_REVALIDATE_URL=https://staging.<domain>/api/revalidate
```

Vercel:

```
NEXT_PUBLIC_API_URL=https://app-staging.<domain>
SANCTUM_APP_URL=https://app-staging.<domain>
SITE_URL=https://staging.<domain>
```

7. **Uptime.** In UptimeRobot, new HTTP(s) monitor, URL `https://app-staging.<domain>/api/health`, interval 5 minutes. Alert when the keyword `"database":"configured"` is missing or the status is not 200.

8. **Smoke.** From a staff Clerk session, run:

```
BASE_SITE=https://staging.<domain> BASE_APP=https://app-staging.<domain> STAFF_TOKEN='<session token>' npm run smoke
```

Production later uses `www.<domain>` and `app.<domain>`, a second Render service with `DEPLOY_ENV=production`, and `ALLOW_PLACEHOLDER` left unset.
