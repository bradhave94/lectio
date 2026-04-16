export const BSB_BIBLE_ID = 3034;

export const TESTAMENT_OPTIONS = [
	{
		value: "ALL",
		labelKey: "builder.bookPicker.tabs.all",
	},
	{
		value: "OT",
		labelKey: "builder.bookPicker.tabs.ot",
	},
	{
		value: "NT",
		labelKey: "builder.bookPicker.tabs.nt",
	},
] as const;
export type TestamentOption = (typeof TESTAMENT_OPTIONS)[number]["value"];

// Translation keys below are relative to the `lectio` namespace, matching the
// `useTranslations("lectio")` scope used by all lectio components.
export const RESOURCE_TYPE_LABELS = {
	reading_plan: "resourceTypes.reading_plan",
	video: "resourceTypes.video",
	podcast: "resourceTypes.podcast",
	book: "resourceTypes.book",
	article: "resourceTypes.article",
	other: "resourceTypes.other",
} as const;
export const RESOURCE_TYPE_OPTIONS = Object.keys(
	RESOURCE_TYPE_LABELS,
) as Array<keyof typeof RESOURCE_TYPE_LABELS>;

export const STATUS_LABELS = {
	not_started: "status.not_started",
	in_progress: "status.in_progress",
	completed: "status.completed",
} as const;

export const STATUS_ORDER = ["not_started", "in_progress", "completed"] as const;

export type PlanBookResourceType = keyof typeof RESOURCE_TYPE_LABELS;
export type PlanBookStatus = keyof typeof STATUS_LABELS;
