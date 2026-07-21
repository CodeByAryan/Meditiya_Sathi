-- Migration: Add buildings, wings, and residents tables for the society management system

-- 1. Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  building_name TEXT NOT NULL,
  has_wings BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Wings table
CREATE TABLE IF NOT EXISTS wings (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  wing_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, wing_name)
);

-- 3. Residents table
CREATE TABLE IF NOT EXISTS residents (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  wing_id INTEGER REFERENCES wings(id),
  flat_no TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, wing_id, flat_no)
);

-- Index for quick duplicate checks
CREATE INDEX IF NOT EXISTS idx_residents_mobile ON residents(mobile);
CREATE INDEX IF NOT EXISTS idx_residents_building_flat ON residents(building_id, wing_id, flat_no);
CREATE INDEX IF NOT EXISTS idx_wings_building_id ON wings(building_id);

