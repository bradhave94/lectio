ALTER TABLE "user" ADD COLUMN "daily_goal_chapters" integer;--> statement-breakpoint
ALTER TABLE "reading_logs" ADD COLUMN "note_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("note", ''))) STORED;
--> statement-breakpoint
CREATE INDEX "reading_logs_note_tsv_idx" ON "reading_logs" USING gin ("note_tsv");
--> statement-breakpoint
ALTER TABLE "plan_books" DROP CONSTRAINT IF EXISTS "plan_books_resource_type_check";
--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_url";
--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_label";
--> statement-breakpoint
ALTER TABLE "plan_books" DROP COLUMN IF EXISTS "resource_type";
