-- Migration: add sender column to emails for organisation name extracted by Claude
ALTER TABLE emails ADD COLUMN sender VARCHAR(255) NULL AFTER from_name;
