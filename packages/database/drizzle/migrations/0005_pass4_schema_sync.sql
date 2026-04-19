-- The actual column drops happened in 0004_pass4_habits via raw SQL with
-- IF EXISTS guards. This file exists only to keep the drizzle snapshot in
-- sync with the schema; the statements below are no-ops on databases that
-- already applied 0004 and a safety net for any environment that bypassed
-- it.
ALTER TABLE "plan_books" DROP CONSTRAINT IF EXISTS "plan_books_resource_type_check";--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_url";--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_label";--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_type";
