# A quick detour

A Rickroll redirect page with an explicit analytics choice. Visitors can allow
or decline before continuing. If they allow, Neon stores their IP address,
country, estimated city and ISP, and coarse browser/OS categories. The IP is
sent to [IPWho.is](https://ipwho.is/) for an approximate city and ISP lookup.
The app does not store full requests, raw headers, cookies, or URLs.

## Run locally

1. Create a Neon project and copy its connection string.
2. Set `DATABASE_URL` to that connection string in the environment or hosting
   provider's secret settings. Keep it private and do not commit it. The app
   creates its analytics table automatically at startup.
3. Run `npm install`, then `npm start`.
4. Open `http://localhost:3000`. Visitors choose whether to allow analytics;
   either choice redirects to the video.

If the geolocation lookup is unavailable, the app falls back to country headers
`x-vercel-ip-country` or `cf-ipcountry`, when present, and saves null city/ISP.
These headers should only be trusted when the request passes through the
corresponding hosting proxy. If the app runs behind a reverse proxy, set
`TRUST_PROXY_HOPS` to the exact number of trusted proxy hops so Express can
resolve the visitor IP. Never enable proxy trust for untrusted clients.

Consent-based records contain IP addresses and are personal data. Set an
appropriate privacy notice for your audience. Records are automatically
deleted after 30 days (on startup, daily, and before new analytics are saved).
If Neon is unavailable, visitors are still redirected and the page reports
that analytics were not saved. Location and ISP are estimates from the IP
geolocation service and may be inaccurate.
