ALTER TABLE learning_objects
  ADD COLUMN IF NOT EXISTS "canonicalUrl" varchar,
  ADD COLUMN IF NOT EXISTS "persistentIdentifier" varchar,
  ADD COLUMN IF NOT EXISTS "citationText" text;

CREATE INDEX IF NOT EXISTS learning_objects_persistent_identifier_idx
  ON learning_objects ("persistentIdentifier");
