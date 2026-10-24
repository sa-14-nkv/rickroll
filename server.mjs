import express from "express";
import { neon } from "@neondatabase/serverless";
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
    const forwardedCountry = request.get("x-vercel-ip-country") || request.get("cf-ipcountry");
    const country = forwardedCountry && /^[a-z]{2}$/i.test(forwardedCountry)
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
      INSERT INTO analytics_events (ip_address, country_code, browser, operating_system)
      VALUES (${request.ip || null}, ${country}, ${browser}, ${operatingSystem})
    `;
    response.json({ redirectUrl });
  } catch (error) {
    next(error);
  }
}

app.post("/api/analytics", recordAnalytics);
app.post("/api/analitycs", recordAnalytics);

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
          browser TEXT NOT NULL,
          operating_system TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
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
