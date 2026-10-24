# Rickroll redirect

A Rickroll redirect page that sends an analytics request automatically when it
loads. Neon stores the visitor IP, country, estimated city and ISP, and coarse
browser/OS categories. The IP is sent to [IPWho.is](https://ipwho.is/) for an
approximate city and ISP lookup. The app does not store full requests, raw
headers, cookies, or URLs.

## Run locally

1. Create a Neon project and copy its connection string.
2. Set `DATABASE_URL` to that connection string in the environment or hosting
   provider's secret settings. Keep it private and do not commit it. The app
   creates its analytics table automatically at startup.
3. Run `npm install`, then `npm start`.
4. Open `http://localhost:3000`. The page redirects to the video after the
   analytics request.

On Vercel, the app reads the visitor IP from Vercel's `x-forwarded-for` request
header and the country/city from Vercel's `x-vercel-ip-country` and
`x-vercel-ip-city` headers. Vercel documents that it overwrites the forwarded
IP header to prevent spoofing. Outside Vercel, configure `TRUST_PROXY_HOPS` to
the exact number of trusted proxy hops so Express can resolve the visitor IP.
Never enable proxy trust for untrusted clients.

On Vercel, the app resolves the visitor IP using Vercel's forwarded-IP header,
not the serverless runtime's local address. If the IP geolocation lookup is
unavailable, Vercel's country and city headers are still saved when present;
ISP will be null.

Analytics records contain IP addresses and are personal data. Make sure your
site's notice and consent flow match this automatic collection. Records are automatically
deleted after 30 days (on startup, daily, and before new analytics are saved).
If Neon is unavailable, visitors are still redirected and the page reports
that analytics were not saved. Location and ISP are estimates from the IP
geolocation service and may be inaccurate.
