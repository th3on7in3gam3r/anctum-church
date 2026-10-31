# Troubleshooting

## Congregants cannot hear the pastor

- Pastor must turn on **host microphone** in Control Room.
- Congregant should tap **Enable Prayer Audio** on the join page (browsers block autoplay).
- Confirm **LiveKit** is configured (check Media Engine status in footer).
- Pastor and congregant should use the **join link**, not the dashboard URL.

## "LiveKit connection unavailable"

- Server environment needs `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
- On Render, ensure env vars are set and the service has redeployed.
- Free LiveKit tiers may spin down — retry after a minute.

## Congregant hears themselves, not the pastor

- Usually an identity/token issue — refresh the join page.
- Pastor must be in Control Room with host mic on.
- Test in a separate browser or incognito window for congregant view.

## Raised hand not showing in Control Room

- Control Room polls every ~1.5 seconds; wait a moment or hard refresh.
- Confirm the congregant joined the same room slug.
- Hand must be raised after successfully joining (not during a failed join).

## Holding to speak is not working

- Host must **open the floor** (leave Sermon mode).
- Congregant taps **Hold to speak**, then taps again to stop.
- Only one congregant can speak at a time.

## Duplicate names in roster

- Two separate browser sessions can use the same display name.
- Roster appends · 1, · 2 to distinguish them.

## Join page redirects to login

- Use the public join link (`/join/your-slug`), not the dashboard.
- Links should use your current site origin (localhost in dev, your domain in production).

## Branding save seems slow

- Save is async; the success toast appears after the server responds. Check network if it takes more than a few seconds.

## Help assistant not responding

- Server needs `GEMINI_API_KEY` configured.
- Only Owner and Admin roles can use the help chat.
