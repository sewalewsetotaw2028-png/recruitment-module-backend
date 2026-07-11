-- Rename Organization table to Company
ALTER TABLE "Organization" RENAME TO "Company";

-- Rename company_id columns to company_id
ALTER TABLE "User" RENAME COLUMN "company_id" TO "company_id";
ALTER TABLE "Role" RENAME COLUMN "company_id" TO "company_id";

-- Rename camelCase columns to snake_case in User
ALTER TABLE "User" RENAME COLUMN "firstName" TO "first_name";
ALTER TABLE "User" RENAME COLUMN "lastName" TO "last_name";
ALTER TABLE "User" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "User" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "User" RENAME COLUMN "lastLogin" TO "last_login";
ALTER TABLE "User" RENAME COLUMN "created_at" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "updated_at" TO "updated_at";

-- Rename camelCase columns to snake_case in Company
ALTER TABLE "Company" RENAME COLUMN "logoUrl" TO "logo_url";
ALTER TABLE "Company" RENAME COLUMN "created_at" TO "created_at";
ALTER TABLE "Company" RENAME COLUMN "updated_at" TO "updated_at";

-- Rename created_at in Role
ALTER TABLE "Role" RENAME COLUMN "created_at" TO "created_at";
