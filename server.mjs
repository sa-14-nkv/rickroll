import express from "express";
import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));
const redirectUrl = "https://youtu.be/dQw4w9WgXcQ";
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

app.use(express.static(publicDirectory));

app.post("/api/redirect", async (_request, response, next) => {
  if (!sql) {
    response.status(503).json({ error: "DATABASE_URL is not configured; the click counter is unavailable." });
    return;
  }

  try {
    await sql`
      INSERT INTO prank_stats (id, clicks)
      VALUES (1, 1)
      ON CONFLICT (id)
      DO UPDATE SET clicks = prank_stats.clicks + 1
    `;
    response.json({ redirectUrl });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error("Failed to update the aggregate click counter:", error);
  if (!response.headersSent) {
    response.status(503).json({ error: "Neon is unavailable; the click counter could not be updated." });
  }
});

async function start() {
  if (!sql) {
    console.error("DATABASE_URL is not configured. The redirect will work, but clicks will not be saved.");
  } else {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS prank_stats (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          clicks BIGINT NOT NULL DEFAULT 0
        )
      `;
      await sql`
        INSERT INTO prank_stats (id, clicks)
        VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING
      `;
      console.log("Neon click counter is ready.");
    } catch (error) {
      console.error("Could not initialize the Neon click counter:", error);
    }
  }

  app.listen(port, () => {
    console.log(`Prank page listening on port ${port}`);
  });
}

start();
