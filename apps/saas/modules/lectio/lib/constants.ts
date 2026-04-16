import {
	BookOpenIcon,
	CompassIcon,
	FlameIcon,
	HeartIcon,
	LeafIcon,
	MountainIcon,
	SparklesIcon,
	SunIcon,
	type LucideIcon,
} from "lucide-react";

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
export const STATUS_LABELS = {
	not_started: "status.not_started",
	in_progress: "status.in_progress",
	completed: "status.completed",
} as const;

export const STATUS_ORDER = ["not_started", "in_progress", "completed"] as const;

export type PlanBookStatus = keyof typeof STATUS_LABELS;

/**
 * Visual styling tokens for plans. Tailwind-friendly utility classes; we keep
 * everything in a single map so the picker, badges, journal entries, and plan
 * cards all stay in sync.
 */
export interface PlanColorTokens {
	key: PlanColorKey;
	label: string;
	swatch: string;
	border: string;
	soft: string;
	text: string;
	dot: string;
}

const PLAN_COLOR_DEFINITIONS = {
	emerald: {
		label: "Emerald",
		swatch: "bg-emerald-500",
		border: "border-emerald-500/40",
		soft: "bg-emerald-500/10",
		text: "text-emerald-600 dark:text-emerald-400",
		dot: "bg-emerald-500",
	},
	sky: {
		label: "Sky",
		swatch: "bg-sky-500",
		border: "border-sky-500/40",
		soft: "bg-sky-500/10",
		text: "text-sky-600 dark:text-sky-400",
		dot: "bg-sky-500",
	},
	violet: {
		label: "Violet",
		swatch: "bg-violet-500",
		border: "border-violet-500/40",
		soft: "bg-violet-500/10",
		text: "text-violet-600 dark:text-violet-400",
		dot: "bg-violet-500",
	},
	amber: {
		label: "Amber",
		swatch: "bg-amber-500",
		border: "border-amber-500/40",
		soft: "bg-amber-500/10",
		text: "text-amber-600 dark:text-amber-400",
		dot: "bg-amber-500",
	},
	rose: {
		label: "Rose",
		swatch: "bg-rose-500",
		border: "border-rose-500/40",
		soft: "bg-rose-500/10",
		text: "text-rose-600 dark:text-rose-400",
		dot: "bg-rose-500",
	},
	slate: {
		label: "Slate",
		swatch: "bg-slate-500",
		border: "border-slate-500/40",
		soft: "bg-slate-500/10",
		text: "text-slate-600 dark:text-slate-400",
		dot: "bg-slate-500",
	},
} as const;

export type PlanColorKey = keyof typeof PLAN_COLOR_DEFINITIONS;
export const PLAN_COLOR_KEYS = Object.keys(PLAN_COLOR_DEFINITIONS) as PlanColorKey[];

export const PLAN_COLORS: Record<PlanColorKey, PlanColorTokens> = Object.fromEntries(
	(Object.entries(PLAN_COLOR_DEFINITIONS) as Array<
		[PlanColorKey, (typeof PLAN_COLOR_DEFINITIONS)[PlanColorKey]]
	>).map(([key, value]) => [key, { key, ...value }]),
) as Record<PlanColorKey, PlanColorTokens>;

const FALLBACK_COLOR: PlanColorKey = "sky";

export function colorTokens(color: string | null | undefined): PlanColorTokens {
	if (color && color in PLAN_COLORS) {
		return PLAN_COLORS[color as PlanColorKey];
	}
	return PLAN_COLORS[FALLBACK_COLOR];
}

/**
 * Deterministic fallback color when a plan has no explicit color set.
 */
export function deriveColorKey(seed: string | null | undefined): PlanColorKey {
	if (!seed) {
		return FALLBACK_COLOR;
	}
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	const idx = Math.abs(hash) % PLAN_COLOR_KEYS.length;
	return PLAN_COLOR_KEYS[idx];
}

const PLAN_ICON_MAP = {
	BookOpen: BookOpenIcon,
	Sparkles: SparklesIcon,
	Sun: SunIcon,
	Flame: FlameIcon,
	Mountain: MountainIcon,
	Leaf: LeafIcon,
	Compass: CompassIcon,
	Heart: HeartIcon,
} satisfies Record<string, LucideIcon>;

export type PlanIconKey = keyof typeof PLAN_ICON_MAP;
export const PLAN_ICON_KEYS = Object.keys(PLAN_ICON_MAP) as PlanIconKey[];

export function iconForKey(icon: string | null | undefined): LucideIcon {
	if (icon && icon in PLAN_ICON_MAP) {
		return PLAN_ICON_MAP[icon as PlanIconKey];
	}
	return BookOpenIcon;
}
