-- Migration: add forwarded-email deduplication columns
ALTER TABLE emails
  ADD COLUMN norm_subject VARCHAR(1000) NULL AFTER processed,
  ADD COLUMN original_from VARCHAR(512) NULL AFTER norm_subject,
  ADD INDEX idx_dedup (norm_subject(255), original_from(255));
