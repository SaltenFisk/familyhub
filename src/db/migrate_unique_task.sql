-- Migration: one task per email. Remove duplicates first (keeps the oldest task per email).
DELETE t1 FROM tasks t1
  JOIN tasks t2 ON t1.email_id = t2.email_id AND t1.id > t2.id;
ALTER TABLE tasks ADD UNIQUE INDEX uq_tasks_email (email_id);
