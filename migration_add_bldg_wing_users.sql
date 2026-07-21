-- Migration: add society building + wing fields to users
-- Store empty values as NULL by keeping these columns nullable.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bldg_name TEXT,
  ADD COLUMN IF NOT EXISTS wing TEXT;

