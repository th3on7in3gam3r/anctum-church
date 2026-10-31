# Sanctum Live side panel

Chrome and Edge extension that keeps live prayer audio playing while you browse other tabs. Congregants join as listeners with a name and a room link. Keep the side panel open.

This is not in the Chrome Web Store yet. Load it unpacked on your computer.

## Load unpacked

1. From the Sanctum Live repo root, install dependencies if needed (`npm install`) and build:

   ```bash
   npm run build:extension
   ```

2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the `extension/dist` folder.

Click the Sanctum Live toolbar icon to open the side panel. Paste a join link (or pick a live gathering), enter your name, and join. Leave the panel open while you use other tabs.

For local testing, expand **Server** at the bottom of the panel and set the origin to `http://localhost:3000` (with `npm run dev` running).

## What it does not do

Raise hand, speaker invites, chat, and prayer requests stay on the full join page. Closing the side panel ends the audio.
