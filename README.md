# Sanctum Storehouse

A church management app that each church makes its own: they switch features on and off, set their name, logo and colors, and decide what every staff role can do.

It includes everything from Sanctum Live (live prayer rooms, prayer requests, members, households, groups, visitors, events, sermons, gallery, announcements, and the church website content) plus **Church setup**.

## Church setup

Open **Admin → Church setup** in the staff app. Only people whose role has *Manage church setup* see it — by default the church's **Super Admin** and **Developer**.

| Section | What it does |
| --- | --- |
| Features | Turn each part of the app on or off. Turning one off hides it for everyone and also turns off anything that depends on it. Nothing is deleted. Features marked *Coming soon* (giving, cash counting, kids check-in…) can't be turned on yet. |
| Brand | Church name, app name, logo, one of five color themes (all checked for readable contrast in light and dark mode), and the words the church uses ("Tithe", "First Lady", "Groups", "Members"). |
| Roles & access | Each role is a saved set of levels — None, View, Edit, Approve — for People, Giving, Events, Kids, Prayer, Sermons & gallery, Website and Announcements, plus the *Manage church setup* switch. Churches can create their own roles. |
| Staff | Give each staff member a role. |
| Activity log | Who changed what, and when. |

### Guardrails

- You can only edit, delete or hand out roles ranked **below** your own. A Developer can't make anyone a Super Admin, and can't touch a Super Admin.
- Nobody can change their own role.
- The Super Admin role always has full access and can't be edited.
- A church always keeps at least one Super Admin.
- A role can only be deleted once nobody has it.
- The server enforces all of this. Every `/api/cms/*` request checks that the feature is on and that the person's role has the needed level (View to read, Edit to change).

Starting roles: Super Admin, Developer, Admin, Pastor, Finance, Secretary, Moderator, Media team, Ministry Leader, Volunteer. Live prayer rooms still use the original five Sanctum roles underneath; each church role maps to one by its Prayer level.

## Member area

Church members sign in from the church website and see their own page: profile, household, groups with live huddles, live prayer, events (RSVP as themselves) and their prayer requests. In **Church setup → Member area** the Super Admin or Developer turns member sign-in on or off, chooses which of those pages members see, and decides whether members may edit their own phone, email and birthday. A page also stays hidden while the church feature it needs is off. Members never reach staff pages.

Today members sign in through the demo; real churches will sign in with a code sent to their phone or email (not built yet).

## Demo mode

A sample church ("Grace Fellowship Church") that anyone can try without an account.

- `/` — the church's own website (service times, events with RSVP, sermons, groups, leaders, visit and prayer cards)
- `/my/sign-in` — member sign-in (Sarah, Paul or Rebecca), then `/my` for their member page
- `/login` — staff sign-in
- `/storehouse` — the Sanctum Storehouse product page

On `/login`, pick who to be — Super Admin, Developer, Pastor, Admin, Secretary, Moderator, Ministry Leader or Volunteer — and switch any time from the sidebar. **Reset demo data** rebuilds the sample church.

```
DEMO_MODE=true
VITE_DEMO_MODE=true
DEMO_SECRET=<at least 16 random characters>
```

Demo mode never runs with `DEPLOY_ENV=production`; the API refuses to start. Use a separate database for the demo. Live prayer audio and gallery uploads need LiveKit and Cloudinary keys; without them the rest of the demo works.

### Put the demo online (Render)

1. In Render: **New → Blueprint**, pick this repository, and set **Blueprint path** to `render.demo.yaml`.
2. Deploy. Render creates the database, generates `DEMO_SECRET`, runs the migrations and starts the app.
3. Open the service address and pick a role.

## Run locally

```
npm ci
cp .env.example .env      # set DATABASE_URL; add the demo lines above to try demo mode
npx prisma migrate deploy
npm run dev               # app on http://localhost:3000, API on :3001
```

Checks: `npm run lint`, `npm test`, `npm run build`.

Deployment for a real church (Clerk sign-in, LiveKit, Cloudinary, the public website in `site/`) is described in `DEPLOY.md`.

## Not finished yet

- Online giving (Flutterwave mobile money and card), cash counting, fundraisers, budgets, attendance, kids check-in and birthday greetings show as *Coming soon*.
- The public website in `site/` still carries the first church's content and logo. It is not part of the demo.
- Live prayer pages and staff-only API routes outside `/api/cms` (prayer rooms, team) are hidden by the menu and the role mapping, not yet by feature switches on the server.
