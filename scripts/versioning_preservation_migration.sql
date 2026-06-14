ALTER TABLE learning_objects
  ADD COLUMN IF NOT EXISTS "fileChecksumSha256" varchar,
  ADD COLUMN IF NOT EXISTS "currentVersion" varchar NOT NULL DEFAULT '0.1';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_object_versions_changetype_enum') THEN
    CREATE TYPE learning_object_versions_changetype_enum AS ENUM (
      'initial_publication',
      'metadata_update',
      'file_update'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS learning_object_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "learningObjectId" uuid NOT NULL REFERENCES learning_objects(id) ON DELETE CASCADE,
  "versionLabel" varchar NOT NULL,
  "changeType" learning_object_versions_changetype_enum NOT NULL,
  title varchar NOT NULL,
  description text,
  author varchar NOT NULL,
  "lomMetadata" jsonb,
  "fileUrl" varchar,
  "fileMimeType" varchar,
  "originalFilename" varchar,
  "fileSize" integer,
  "fileChecksumSha256" varchar,
  "changeNote" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_object_versions_object_version_unique UNIQUE ("learningObjectId", "versionLabel")
);

CREATE INDEX IF NOT EXISTS learning_object_versions_object_idx
  ON learning_object_versions ("learningObjectId");
