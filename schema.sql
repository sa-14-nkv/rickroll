CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address TEXT,
  country_code CHAR(2),
  city TEXT,
  isp TEXT,
  browser TEXT NOT NULL,
  operating_system TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
