CREATE TABLE "book_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_num" integer NOT NULL,
	"verse_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"usfm_code" text NOT NULL,
	"name" text NOT NULL,
	"testament" text NOT NULL,
	"canon_order" integer NOT NULL,
	"chapter_count" integer NOT NULL,
	CONSTRAINT "books_testament_check" CHECK ("books"."testament" IN ('OT', 'NT'))
);
--> statement-breakpoint
CREATE TABLE "plan_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"resource_url" text,
	"resource_label" text,
	"resource_type" text,
	"notes" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_books_resource_type_check" CHECK ("plan_books"."resource_type" IS NULL OR "plan_books"."resource_type" IN ('reading_plan', 'video', 'podcast', 'book', 'article', 'other')),
	CONSTRAINT "plan_books_status_check" CHECK ("plan_books"."status" IN ('not_started', 'in_progress', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_book_id" uuid NOT NULL,
	"chapter_start" integer NOT NULL,
	"chapter_end" integer NOT NULL,
	"verse_start" integer,
	"verse_end" integer,
	"note" text,
	"logged_at" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_logs_chapter_range_check" CHECK ("reading_logs"."chapter_end" >= "reading_logs"."chapter_start"),
	CONSTRAINT "reading_logs_verse_range_check" CHECK (("reading_logs"."verse_start" IS NULL AND "reading_logs"."verse_end" IS NULL) OR ("reading_logs"."verse_start" IS NOT NULL AND "reading_logs"."verse_end" IS NOT NULL AND "reading_logs"."verse_end" >= "reading_logs"."verse_start"))
);
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_books" ADD CONSTRAINT "plan_books_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_books" ADD CONSTRAINT "plan_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_plan_book_id_plan_books_id_fk" FOREIGN KEY ("plan_book_id") REFERENCES "public"."plan_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_chapters_book_chapter_uidx" ON "book_chapters" USING btree ("book_id","chapter_num");--> statement-breakpoint
CREATE INDEX "book_chapters_book_id_idx" ON "book_chapters" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "books_usfm_code_uidx" ON "books" USING btree ("usfm_code");--> statement-breakpoint
CREATE UNIQUE INDEX "books_canon_order_uidx" ON "books" USING btree ("canon_order");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_books_plan_book_uidx" ON "plan_books" USING btree ("plan_id","book_id");--> statement-breakpoint
CREATE INDEX "plan_books_plan_order_idx" ON "plan_books" USING btree ("plan_id","order_index");--> statement-breakpoint
CREATE INDEX "plan_books_plan_id_idx" ON "plan_books" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_books_book_id_idx" ON "plan_books" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "plans_user_id_idx" ON "plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_logs_plan_book_idx" ON "reading_logs" USING btree ("plan_book_id");--> statement-breakpoint
CREATE INDEX "reading_logs_plan_book_logged_at_idx" ON "reading_logs" USING btree ("plan_book_id","logged_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_plan_timestamp()
RETURNS trigger AS $$
BEGIN
	UPDATE plans
	SET updated_at = now()
	WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);

	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER plan_books_updated
AFTER INSERT OR UPDATE OR DELETE ON "plan_books"
FOR EACH ROW EXECUTE FUNCTION update_plan_timestamp();