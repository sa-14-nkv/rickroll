# A quick detour

A small automatic Rickroll redirect page. The Neon database stores a single
site-wide click total; the app does not save visitor IP addresses, request
headers, URLs, or per-visitor records.

## Run locally

1. Create a Neon project and copy its connection string.
2. Set `DATABASE_URL` to that connection string in the environment or hosting
   provider's secret settings. Keep it private and do not commit it.
3. Run `npm install`, then `npm start`.
4. Open `http://localhost:3000`. Visitors are automatically redirected.

The app automatically creates the aggregate counter table in Neon at startup.
Each page visit increments the total and redirects to the fixed YouTube video.
If Neon is unavailable or not configured, the app logs the issue and still
redirects after displaying a brief message.
