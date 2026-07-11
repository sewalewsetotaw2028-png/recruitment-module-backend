-- AlterTable
ALTER TABLE "User" ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "terms_accepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "terms_accepted" BOOLEAN NOT NULL DEFAULT false;
