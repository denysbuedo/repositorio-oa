CREATE TABLE IF NOT EXISTS lti_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  issuer varchar NOT NULL UNIQUE,
  "clientId" varchar NOT NULL,
  "deploymentId" varchar NULL,
  "authLoginUrl" varchar NULL,
  "authTokenUrl" varchar NULL,
  "jwksUrl" varchar NULL,
  enabled boolean NOT NULL DEFAULT true,
  notes text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lti_platforms_issuer
  ON lti_platforms (issuer);

CREATE INDEX IF NOT EXISTS idx_lti_platforms_enabled
  ON lti_platforms (enabled);
