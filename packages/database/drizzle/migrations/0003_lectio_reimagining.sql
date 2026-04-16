ALTER TABLE "plan_books" ADD COLUMN "chapter_start" integer;--> statement-breakpoint
ALTER TABLE "plan_books" ADD COLUMN "chapter_end" integer;--> statement-breakpoint
ALTER TABLE "plan_books" ADD COLUMN "status_manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "target_end_date" date;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "cadence" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reading_logs" ADD COLUMN "submission_id" uuid;--> statement-breakpoint
CREATE INDEX "plans_user_archived_idx" ON "plans" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "reading_logs_submission_id_idx" ON "reading_logs" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "plan_books" ADD CONSTRAINT "plan_books_chapter_scope_check" CHECK (("plan_books"."chapter_start" IS NULL AND "plan_books"."chapter_end" IS NULL) OR ("plan_books"."chapter_start" IS NOT NULL AND "plan_books"."chapter_end" IS NOT NULL AND "plan_books"."chapter_start" >= 1 AND "plan_books"."chapter_end" >= "plan_books"."chapter_start"));--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_plan_timestamp_from_reading_logs()
RETURNS trigger AS $$
BEGIN
	UPDATE plans
	SET updated_at = now()
	WHERE id IN (
		SELECT plan_id FROM plan_books WHERE id = COALESCE(NEW.plan_book_id, OLD.plan_book_id)
	);

	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS reading_logs_updated ON "reading_logs";
--> statement-breakpoint
CREATE TRIGGER reading_logs_updated
AFTER INSERT OR UPDATE OR DELETE ON "reading_logs"
FOR EACH ROW EXECUTE FUNCTION update_plan_timestamp_from_reading_logs();
