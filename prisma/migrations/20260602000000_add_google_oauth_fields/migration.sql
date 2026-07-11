-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "google_id" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "google_id" TEXT;

-- Create unique partial indexes for optional google_id
CREATE UNIQUE INDEX IF NOT EXISTS "User_google_id_key" ON "User" ("google_id") WHERE "google_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_google_id_key" ON "Candidate" ("google_id") WHERE "google_id" IS NOT NULL;
