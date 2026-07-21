-- AlterTable: Add email verification fields to User model
ALTER TABLE "user" ADD COLUMN     "email_verification_token" TEXT,
ADD COLUMN     "email_verification_expires" TIMESTAMP(3);

-- AlterTable: Add email verification fields to Candidate model
ALTER TABLE "candidate" ADD COLUMN     "email_verification_token" TEXT,
ADD COLUMN     "email_verification_expires" TIMESTAMP(3);
