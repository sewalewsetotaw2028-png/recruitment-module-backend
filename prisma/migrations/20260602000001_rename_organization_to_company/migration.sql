-- Make renames idempotent: check existence before attempting to rename

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'Organization'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'Company'
	) THEN
		EXECUTE 'ALTER TABLE "Organization" RENAME TO "Company"';
	END IF;
END$$;

-- Rename company_id columns only if the old column exists and the new one does not
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='company_id'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='company_id'
	) THEN
		-- no-op (same name); kept for safety
	END IF;
END$$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='Role' AND column_name='company_id'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='Role' AND column_name='company_id'
	) THEN
		-- no-op (same name); kept for safety
	END IF;
END$$;

-- Rename camelCase columns to snake_case in User if present
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='firstName'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='first_name'
	) THEN
		EXECUTE 'ALTER TABLE "User" RENAME COLUMN "firstName" TO "first_name"';
	END IF;
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='lastName'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='last_name'
	) THEN
		EXECUTE 'ALTER TABLE "User" RENAME COLUMN "lastName" TO "last_name"';
	END IF;
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='passwordHash'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='password_hash'
	) THEN
		EXECUTE 'ALTER TABLE "User" RENAME COLUMN "passwordHash" TO "password_hash"';
	END IF;
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='isActive'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='is_active'
	) THEN
		EXECUTE 'ALTER TABLE "User" RENAME COLUMN "isActive" TO "is_active"';
	END IF;
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='lastLogin'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='User' AND column_name='last_login'
	) THEN
		EXECUTE 'ALTER TABLE "User" RENAME COLUMN "lastLogin" TO "last_login"';
	END IF;
END$$;

-- Rename camelCase columns to snake_case in Company if present
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='Company' AND column_name='logoUrl'
	) AND NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='Company' AND column_name='logo_url'
	) THEN
		EXECUTE 'ALTER TABLE "Company" RENAME COLUMN "logoUrl" TO "logo_url"';
	END IF;
END$$;

-- Created/updated_at renames are safe no-ops if already snake_case
DO $$
BEGIN
	-- Role.created_at handled elsewhere; left intentionally minimal
END$$;
