// Postgres (Neon) schema. Every statement must be safe to re-run on every
// cold start (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS) -- the same
// list creates a fresh database and migrates an existing one.

export const SCHEMA_STATEMENTS: string[] = [
  // Anonymous, tap-only identity: one row per installed browser/device.
  `CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer','trader','both')),
    lang TEXT NOT NULL DEFAULT 'bn' CHECK (lang IN ('en','bn')),
    district TEXT NOT NULL,
    commodities TEXT[] NOT NULL DEFAULT '{}',
    pushes_per_day SMALLINT NOT NULL DEFAULT 2 CHECK (pushes_per_day BETWEEN 0 AND 3),
    push_subscription JSONB,
    trust REAL NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS devices_push_idx ON devices (pushes_per_day) WHERE push_subscription IS NOT NULL`,

  `CREATE TABLE IF NOT EXISTS weather_reports (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    district TEXT NOT NULL,
    report_date DATE NOT NULL,
    slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),
    rain TEXT NOT NULL CHECK (rain IN ('none','light','heavy')),
    heat SMALLINT NOT NULL CHECK (heat BETWEEN 1 AND 5),
    storm BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, report_date, slot)
  )`,
  `CREATE INDEX IF NOT EXISTS weather_reports_district_idx ON weather_reports (district, report_date)`,

  `CREATE TABLE IF NOT EXISTS price_reports (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    district TEXT NOT NULL,
    commodity TEXT NOT NULL,
    price_type TEXT NOT NULL CHECK (price_type IN ('wholesale','retail')),
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    report_date DATE NOT NULL,
    flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, commodity, price_type, report_date)
  )`,
  `CREATE INDEX IF NOT EXISTS price_reports_lookup_idx ON price_reports (commodity, district, report_date)`,

  // Prices from open web sources. district NULL = national / Dhaka-only source.
  `CREATE TABLE IF NOT EXISTS ext_prices (
    source TEXT NOT NULL,
    commodity TEXT NOT NULL,
    market TEXT NOT NULL,
    district TEXT,
    price_type TEXT NOT NULL,
    obs_date DATE NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    price_min NUMERIC(12,2),
    price_max NUMERIC(12,2),
    PRIMARY KEY (source, commodity, market, price_type, obs_date)
  )`,
  `CREATE INDEX IF NOT EXISTS ext_prices_commodity_idx ON ext_prices (commodity, obs_date)`,

  `CREATE TABLE IF NOT EXISTS weather_forecasts (
    district TEXT NOT NULL,
    issued_date DATE NOT NULL,
    target_date DATE NOT NULL,
    tmax REAL, tmin REAL, precip_mm REAL, precip_prob REAL, wind_max REAL, weather_code SMALLINT,
    PRIMARY KEY (district, issued_date, target_date)
  )`,
  `CREATE TABLE IF NOT EXISTS weather_observed (
    district TEXT NOT NULL,
    obs_date DATE NOT NULL,
    tmax REAL, tmin REAL, precip_mm REAL,
    PRIMARY KEY (district, obs_date)
  )`,
  `CREATE TABLE IF NOT EXISTS climate_normals (
    division TEXT NOT NULL,
    month SMALLINT NOT NULL,
    tmax REAL NOT NULL, tmin REAL NOT NULL, precip_mm REAL NOT NULL,
    years SMALLINT NOT NULL,
    PRIMARY KEY (division, month)
  )`,

  `CREATE TABLE IF NOT EXISTS price_forecasts (
    commodity TEXT NOT NULL,
    issued_date DATE NOT NULL,
    horizon SMALLINT NOT NULL,
    series_source TEXT NOT NULL,
    last_month TEXT NOT NULL,
    target_month TEXT NOT NULL,
    point NUMERIC(12,2) NOT NULL,
    lo NUMERIC(12,2) NOT NULL,
    hi NUMERIC(12,2) NOT NULL,
    quantiles JSONB NOT NULL,
    model TEXT NOT NULL,
    mape REAL,
    coverage REAL,
    direction_accuracy REAL,
    n_calibration INTEGER NOT NULL,
    n_test INTEGER NOT NULL,
    n_points INTEGER NOT NULL,
    PRIMARY KEY (commodity, issued_date, horizon)
  )`,

  `CREATE TABLE IF NOT EXISTS source_runs (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ok BOOLEAN NOT NULL,
    rows INTEGER NOT NULL DEFAULT 0,
    message TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS source_runs_source_idx ON source_runs (source, started_at DESC)`,

  // v2: deeper location. upazila/union ids come from src/data/bd-admin.json;
  // lat/lon is an optional one-tap GPS fix (rounded to ~100 m on save).
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS upazila_id INTEGER`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS union_id INTEGER`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS place_name TEXT`,
  `ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS upazila_id INTEGER`,
  `ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS union_id INTEGER`,
  `ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`,
  `ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION`,
  `ALTER TABLE price_reports ADD COLUMN IF NOT EXISTS upazila_id INTEGER`,
  `ALTER TABLE price_reports ADD COLUMN IF NOT EXISTS union_id INTEGER`,
  `ALTER TABLE price_reports ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`,
  `ALTER TABLE price_reports ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION`,
  `CREATE INDEX IF NOT EXISTS weather_observed_date_idx ON weather_observed (obs_date)`,

  // Online retailer products we read regular (non-discounted) prices from.
  `CREATE TABLE IF NOT EXISTS retail_products (
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    commodity TEXT NOT NULL,
    name TEXT,
    last_seen DATE,
    PRIMARY KEY (source, url)
  )`,

  // Short-lived cache of Open-Meteo "current conditions", keyed by a ~5 km grid cell.
  `CREATE TABLE IF NOT EXISTS weather_now (
    key TEXT PRIMARY KEY,
    fetched_at TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL
  )`,

  // Fixed-window rate limiter (device creation, report submission).
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL
  )`,
];
