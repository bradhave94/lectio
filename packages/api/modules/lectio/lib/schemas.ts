import { PLAN_COLOR_VALUES, PLAN_ICON_VALUES } from "@repo/database";
import { z } from "zod";

export const planColorSchema = z.enum(PLAN_COLOR_VALUES);
export const planIconSchema = z.enum(PLAN_ICON_VALUES);
export const planStatusSchema = z.enum(["not_started", "in_progress", "completed"]);

export const planDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const chapterRangeSchema = z
	.object({
		start: z.number().int().min(1).max(150),
		end: z.number().int().min(1).max(150),
	})
	.refine((value) => value.end >= value.start, {
		message: "Chapter end must be greater than or equal to chapter start",
	});

export type ChapterRangeInput = z.infer<typeof chapterRangeSchema>;
