CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL UNIQUE,
  description text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learning_objects
  ADD COLUMN IF NOT EXISTS "collectionId" uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FK_learning_objects_collection'
  ) THEN
    ALTER TABLE learning_objects
      ADD CONSTRAINT "FK_learning_objects_collection"
      FOREIGN KEY ("collectionId")
      REFERENCES collections(id)
      ON DELETE SET NULL;
  END IF;
END $$;
