import express from "express";
import { neon } from "@neondatabase/serverless";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));
const redirectUrl = "https://youtu.be/dQw4w9WgXcQ";
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

if (process.env.TRUST_PROXY_HOPS !== undefined) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1) {
    throw new Error("TRUST_PROXY_HOPS must be a positive integer.");
  }
  app.set("trust proxy", hops);
}

app.use(express.static(publicDirectory));

async function recordAnalytics(request, response, next) {
  if (!sql) {
    response.status(503).json({ error: "Analytics are unavailable because DATABASE_URL is not configured." });
    return;
  }

  try {
    const ipAddress = request.ip || null;
    const location = ipAddress && isPublicIp(ipAddress)
      ? await lookupIp(ipAddress)
      : null;
    const forwardedCountry = request.get("x-vercel-ip-country") || request.get("cf-ipcountry");
    const proxyCountry = forwardedCountry && /^[a-z]{2}$/i.test(forwardedCountry)
      ? forwardedCountry.toUpperCase()
      : null;
    const userAgent = request.get("user-agent") || "";
    const browser = /Edg\//.test(userAgent) ? "Edge"
      : /OPR\//.test(userAgent) ? "Opera"
        : /Firefox\//.test(userAgent) ? "Firefox"
          : /Chrome\//.test(userAgent) ? "Chrome"
            : /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) ? "Safari"
              : "Other";
    const operatingSystem = /Windows/.test(userAgent) ? "Windows"
      : /Android/.test(userAgent) ? "Android"
        : /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
          : /Mac OS X|Macintosh/.test(userAgent) ? "macOS"
            : /Linux/.test(userAgent) ? "Linux"
              : "Other";

    await deleteExpiredAnalytics();
    await sql`
      INSERT INTO analytics_events (ip_address, country_code, city, isp, browser, operating_system)
      VALUES (
        ${ipAddress},
        ${location?.countryCode || proxyCountry},
        ${location?.city || null},
        ${location?.isp || null},
        ${browser},
        ${operatingSystem}
      )
    `;
    response.json({ redirectUrl, locationAvailable: Boolean(location) });
  } catch (error) {
    next(error);
  }
}

app.post("/api/analytics", recordAnalytics);
app.post("/api/analitycs", recordAnalytics);

function isPublicIp(address) {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const ipValue = octets.reduce((value, octet) => value * 256 + octet, 0);
    const nonPublicRanges = [
      [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10],
      [0x7f000000, 8], [0xa9fe0000, 16], [0xac100000, 12],
      [0xc0000000, 24], [0xc0000200, 24], [0xc0586300, 24],
      [0xc0a80000, 16], [0xc6120000, 15], [0xc6336400, 24],
      [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4]
    ];
    return !nonPublicRanges.some(([base, prefix]) => {
      const blockSize = 2 ** (32 - prefix);
      return Math.floor(ipValue / blockSize) === Math.floor(base / blockSize);
    });
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized.startsWith("2") || normalized.startsWith("3");
  }
  return false;
}

async function lookupIp(ipAddress) {
  try {
    const url = `https://ipwho.is/${encodeURIComponent(ipAddress)}?fields=success,country_code,city,connection.isp`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      console.error(`IP geolocation provider returned HTTP ${response.status}.`);
      return null;
    }

    const result = await response.json();
    if (!result.success) {
      console.error("IP geolocation provider could not locate this address.");
      return null;
    }

    return {
      countryCode: typeof result.country_code === "string" && /^[a-z]{2}$/i.test(result.country_code)
        ? result.country_code.toUpperCase()
        : null,
      city: typeof result.city === "string" ? result.city.slice(0, 120) : null,
      isp: typeof result.connection?.isp === "string" ? result.connection.isp.slice(0, 200) : null
    };
  } catch (error) {
    console.error("IP geolocation lookup failed:", error.message);
    return null;
  }
}

async function deleteExpiredAnalytics() {
  await sql`
    DELETE FROM analytics_events
    WHERE created_at < NOW() - INTERVAL '30 days'
  `;
}

app.use((error, _request, response, _next) => {
  console.error("Failed to save consented analytics:", error);
  if (!response.headersSent) {
    response.status(503).json({ error: "Analytics could not be saved." });
  }
});

async function start() {
  if (!sql) {
    console.error("DATABASE_URL is not configured. The redirect will work, but clicks will not be saved.");
  } else {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          ip_address TEXT,
          country_code CHAR(2),
          city TEXT,
          isp TEXT,
          browser TEXT NOT NULL,
          operating_system TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS city TEXT`;
      await sql`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS isp TEXT`;
      await deleteExpiredAnalytics();
      setInterval(() => {
        deleteExpiredAnalytics().catch((error) => {
          console.error("Could not delete expired analytics:", error);
        });
      }, 24 * 60 * 60 * 1000);
      console.log("Neon consent-based analytics table is ready.");
    } catch (error) {
      console.error("Could not initialize the Neon analytics table:", error);
    }
  }

  app.listen(port, () => {
    console.log(`Prank page listening on port ${port}`);
  });
}

start();
