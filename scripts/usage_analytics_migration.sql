DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_object_usage_events_eventtype_enum') THEN
    CREATE TYPE learning_object_usage_events_eventtype_enum AS ENUM ('view', 'download', 'lti_launch');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning_object_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "learningObjectId" uuid NOT NULL,
  "eventType" learning_object_usage_events_eventtype_enum NOT NULL,
  source varchar NULL,
  context jsonb NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_learning_object_usage_events_object
    FOREIGN KEY ("learningObjectId")
    REFERENCES learning_objects(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_events_learning_object_id
  ON learning_object_usage_events ("learningObjectId");

CREATE INDEX IF NOT EXISTS idx_usage_events_event_type
  ON learning_object_usage_events ("eventType");

CREATE INDEX IF NOT EXISTS idx_usage_events_created_at
  ON learning_object_usage_events ("createdAt");
