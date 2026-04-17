"use client";

import { ChapterPicker } from "@lectio/components/ChapterPicker";
import { useLogReading } from "@lectio/components/LogReadingProvider";
import { NoteEditor } from "@lectio/components/NoteEditor";
import {
	useBookChaptersQuery,
	useDeleteReadingLogMutation,
	useLectioPlansQuery,
	usePlanBuilderQuery,
	useUpdateReadingLogMutation,
	useUserRecentReadingLogsQuery,
	type PlansListResponse,
	type RecentLogsResponse,
} from "@lectio/hooks/use-lectio";
import { colorTokens, iconForKey } from "@lectio/lib/constants";
import { formatReadingLogLabel } from "@lectio/lib/reading-log";
import {
	Button,
	Card,
	cn,
	Input,
	Label,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { useIsBelowLg } from "@shared/hooks/use-media-query";
import {
	ArrowDownNarrowWideIcon,
	ArrowUpNarrowWideIcon,
	BookOpenIcon,
	CalendarIcon,
	CheckIcon,
	FilterIcon,
	PencilIcon,
	SearchIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { NoteMarkdown } from "./NoteMarkdown";

interface JournalViewProps {
	initialPlans: PlansListResponse;
	initialEntries: RecentLogsResponse;
}

type SortDirection = "newest" | "oldest";

type DatePreset = "last7" | "last30" | "thisMonth" | "all" | "custom";

interface DateRange {
	from: string;
	to: string;
}

function formatDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function presetRange(preset: DatePreset): DateRange {
	const today = startOfDay(new Date());
	switch (preset) {
		case "last7": {
			const from = new Date(today);
			from.setDate(from.getDate() - 6);
			return { from: formatDate(from), to: formatDate(today) };
		}
		case "last30": {
			const from = new Date(today);
			from.setDate(from.getDate() - 29);
			return { from: formatDate(from), to: formatDate(today) };
		}
		case "thisMonth": {
			const from = new Date(today.getFullYear(), today.getMonth(), 1);
			return { from: formatDate(from), to: formatDate(today) };
		}
		default:
			return { from: "", to: "" };
	}
}

type JournalEntry = RecentLogsResponse[number];

export function JournalView({ initialPlans, initialEntries }: JournalViewProps) {
	const t = useTranslations("lectio.journalPage");
	const tToast = useTranslations("lectio.toast");
	const { openLogReading } = useLogReading();

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [planIds, setPlanIds] = useState<string[]>([]);
	const [bookNames, setBookNames] = useState<string[]>([]);
	const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
	const [datePopoverOpen, setDatePopoverOpen] = useState(false);
	const [sort, setSort] = useState<SortDirection>("newest");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
	const isBelowLg = useIsBelowLg();

	// Debounce the search term so we don't fire a server query per keystroke.
	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedSearch(search.trim());
		}, 300);
		return () => window.clearTimeout(handle);
	}, [search]);

	const entriesQuery = useUserRecentReadingLogsQuery(initialEntries, 200, debouncedSearch);
	const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
	const plansQuery = useLectioPlansQuery(initialPlans, true);
	const plans = plansQuery.data ?? [];

	const filteredEntries = useMemo(() => {
		const fromTs = dateRange.from ? new Date(dateRange.from).getTime() : null;
		const toTs = dateRange.to
			? new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1
			: null;
		const planSet = planIds.length > 0 ? new Set(planIds) : null;
		const bookSet = bookNames.length > 0 ? new Set(bookNames) : null;

		// Search is handled server-side; filter only on plan/book/date locally.
		const filtered = allEntries.filter((entry) => {
			if (planSet && !planSet.has(entry.planId)) return false;
			if (bookSet && !bookSet.has(entry.bookName)) return false;
			const ts = new Date(entry.loggedAt).getTime();
			if (fromTs !== null && ts < fromTs) return false;
			if (toTs !== null && ts > toTs) return false;
			return true;
		});

		filtered.sort((left, right) => {
			const lt = new Date(left.loggedAt).getTime();
			const rt = new Date(right.loggedAt).getTime();
			if (lt !== rt) return sort === "newest" ? rt - lt : lt - rt;
			const lc = new Date(left.createdAt).getTime();
			const rc = new Date(right.createdAt).getTime();
			return sort === "newest" ? rc - lc : lc - rc;
		});

		return filtered;
	}, [allEntries, planIds, bookNames, dateRange, sort]);

	// Auto-select the first visible entry when the selection becomes invalid.
	useEffect(() => {
		if (selectedId && filteredEntries.some((entry) => entry.id === selectedId)) {
			return;
		}
		setSelectedId(filteredEntries[0]?.id ?? null);
	}, [filteredEntries, selectedId]);

	const filtersActive =
		search !== "" ||
		planIds.length > 0 ||
		bookNames.length > 0 ||
		dateRange.from !== "" ||
		dateRange.to !== "";

	const handleClear = () => {
		setSearch("");
		setPlanIds([]);
		setBookNames([]);
		setDateRange({ from: "", to: "" });
	};

	const togglePlan = (planId: string) => {
		setPlanIds((current) =>
			current.includes(planId)
				? current.filter((value) => value !== planId)
				: [...current, planId],
		);
		// Clear book filter when plan filter changes — book lists differ per plan.
		setBookNames([]);
	};

	const toggleBook = (bookName: string) => {
		setBookNames((current) =>
			current.includes(bookName)
				? current.filter((value) => value !== bookName)
				: [...current, bookName],
		);
	};

	const visibleBooks = useMemo(() => {
		const planScope = planIds.length > 0 ? new Set(planIds) : null;
		const set = new Set<string>();
		for (const entry of allEntries) {
			if (planScope && !planScope.has(entry.planId)) continue;
			set.add(entry.bookName);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [allEntries, planIds]);

	const selectedEntry = useMemo(
		() => filteredEntries.find((entry) => entry.id === selectedId) ?? null,
		[filteredEntries, selectedId],
	);

	const handleSelect = (id: string) => {
		setSelectedId(id);
		// Only open the mobile sheet on small screens. On lg+ the inspector is
		// rendered inline as the right column, so spawning a Sheet would only
		// trigger a phantom overlay (radix portals the overlay regardless of
		// CSS visibility).
		if (isBelowLg) {
			setMobileSheetOpen(true);
		}
	};

	return (
		<div className="space-y-4">
			<div className="gap-3 flex flex-wrap items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
				</div>
				<Button type="button" onClick={() => openLogReading()} disabled={plans.length === 0}>
					<BookOpenIcon className="mr-1.5 size-4" />
					{t("logReading")}
				</Button>
			</div>

			{/* Filter bar (always visible; collapses to a single button on mobile). */}
			<Card className="p-3 sm:p-4 space-y-3">
				<div className="gap-2 flex flex-wrap items-center">
					<div className="min-w-[220px] relative flex-1">
						<SearchIcon className="size-4 left-3 top-1/2 absolute -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder={t("filters.search")}
							className="pl-9"
						/>
					</div>

					<div className="hidden md:flex md:flex-wrap md:gap-2 md:items-center">
						<DateRangePopover
							value={dateRange}
							onChange={(next) => setDateRange(next)}
							open={datePopoverOpen}
							onOpenChange={setDatePopoverOpen}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))}
						>
							{sort === "newest" ? (
								<ArrowDownNarrowWideIcon className="mr-1.5 size-4" />
							) : (
								<ArrowUpNarrowWideIcon className="mr-1.5 size-4" />
							)}
							{sort === "newest" ? t("filters.newestFirst") : t("filters.oldestFirst")}
						</Button>
						{filtersActive ? (
							<Button type="button" variant="ghost" size="sm" onClick={handleClear}>
								<XIcon className="mr-1 size-4" />
								{t("filters.clear")}
							</Button>
						) : null}
					</div>

					<div className="md:hidden">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setFiltersOpen((value) => !value)}
						>
							<FilterIcon className="mr-1.5 size-4" />
							{t("filters.open")}
						</Button>
					</div>
				</div>

				{/* Plan + book chip rows */}
				<div className="space-y-2">
					{plans.length > 0 ? (
						<ChipRow
							label={t("filters.plan")}
							items={plans.map((plan) => ({
								key: plan.id,
								label: plan.title,
								color: plan.color,
								active: planIds.includes(plan.id),
								onClick: () => togglePlan(plan.id),
							}))}
						/>
					) : null}
					{visibleBooks.length > 0 ? (
						<ChipRow
							label={t("filters.book")}
							items={visibleBooks.map((book) => ({
								key: book,
								label: book,
								active: bookNames.includes(book),
								onClick: () => toggleBook(book),
							}))}
						/>
					) : null}
				</div>

				{/* Mobile filter dropdown */}
				{filtersOpen ? (
					<div className="md:hidden space-y-2 border-t pt-3">
						<DateRangePopover
							value={dateRange}
							onChange={(next) => setDateRange(next)}
							open={datePopoverOpen}
							onOpenChange={setDatePopoverOpen}
						/>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start"
							onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))}
						>
							{sort === "newest" ? (
								<ArrowDownNarrowWideIcon className="mr-1.5 size-4" />
							) : (
								<ArrowUpNarrowWideIcon className="mr-1.5 size-4" />
							)}
							{sort === "newest" ? t("filters.newestFirst") : t("filters.oldestFirst")}
						</Button>
						{filtersActive ? (
							<Button type="button" variant="ghost" size="sm" onClick={handleClear}>
								<XIcon className="mr-1 size-4" />
								{t("filters.clear")}
							</Button>
						) : null}
					</div>
				) : null}
			</Card>

			<div className="gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] grid">
				{/* Left rail — entry list */}
				<Card className="overflow-hidden flex flex-col min-h-[60vh]">
					<div className="px-3 py-2 border-b flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
						<span>{t("listHeader")}</span>
						<span>
							{t("counts", {
								shown: filteredEntries.length,
								total: allEntries.length,
							})}
						</span>
					</div>
					<div className="flex-1 overflow-y-auto">
						{entriesQuery.isPending ? (
							<div className="space-y-2 p-3">
								{Array.from({ length: 5 }).map((_, idx) => (
									<div key={idx} className="h-14 animate-pulse rounded-md bg-muted" />
								))}
							</div>
						) : filteredEntries.length === 0 ? (
							<p className="p-6 text-sm text-center text-muted-foreground">
								{filtersActive ? t("emptyFiltered") : t("empty")}
							</p>
						) : (
							<ul className="divide-y">
								{filteredEntries.map((entry) => (
									<li key={entry.id}>
										<JournalEntryRow
											entry={entry}
											selected={selectedId === entry.id}
											onSelect={() => handleSelect(entry.id)}
										/>
									</li>
								))}
							</ul>
						)}
					</div>
				</Card>

				{/* Right pane — inspector (lg+ only; mobile uses Sheet) */}
				<Card className="hidden lg:block overflow-hidden">
					{selectedEntry ? (
						<JournalInspector
							key={selectedEntry.id}
							entry={selectedEntry}
							plans={plans}
							onAfterDelete={() => setSelectedId(null)}
							toastSaved={() => toastSuccess(tToast("saved"))}
							toastError={() => toastError(tToast("saveError"))}
						/>
					) : (
						<div className="p-10 text-sm text-center text-muted-foreground">
							{t("selectEmpty")}
						</div>
					)}
				</Card>
			</div>

			{/* Mobile inspector sheet — only mount when actually below the lg
			breakpoint. Mounting unconditionally with `lg:hidden` still spawns
			the radix overlay and blurs the desktop view. */}
			{isBelowLg ? (
				<Sheet open={mobileSheetOpen && selectedEntry !== null} onOpenChange={setMobileSheetOpen}>
					<SheetContent side="right" className="p-0 sm:max-w-[520px] w-full flex flex-col">
						<SheetHeader className="px-4 py-3 border-b">
							<SheetTitle>{t("inspectorHeader")}</SheetTitle>
							<SheetDescription className="sr-only">{t("inspectorHeader")}</SheetDescription>
						</SheetHeader>
						<div className="flex-1 overflow-y-auto">
							{selectedEntry ? (
								<JournalInspector
									key={selectedEntry.id}
									entry={selectedEntry}
									plans={plans}
									onAfterDelete={() => {
										setMobileSheetOpen(false);
										setSelectedId(null);
									}}
									toastSaved={() => toastSuccess(tToast("saved"))}
									toastError={() => toastError(tToast("saveError"))}
								/>
							) : null}
						</div>
					</SheetContent>
				</Sheet>
			) : null}
		</div>
	);
}

interface ChipRowProps {
	label: string;
	items: Array<{
		key: string;
		label: string;
		color?: string | null;
		active: boolean;
		onClick: () => void;
	}>;
}

function ChipRow({ label, items }: ChipRowProps) {
	return (
		<div className="gap-2 flex flex-wrap items-center">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			{items.map((item) => {
				const tokens = item.color !== undefined ? colorTokens(item.color) : null;
				return (
					<button
						key={item.key}
						type="button"
						aria-pressed={item.active}
						onClick={item.onClick}
						className={cn(
							"gap-1.5 px-2.5 py-1 text-xs flex items-center rounded-full border transition-colors",
							item.active
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-background hover:bg-accent",
						)}
					>
						{tokens ? <span className={cn("size-2 rounded-full", tokens.dot)} /> : null}
						{item.label}
						{item.active ? <CheckIcon className="size-3" /> : null}
					</button>
				);
			})}
		</div>
	);
}

interface JournalEntryRowProps {
	entry: JournalEntry;
	selected: boolean;
	onSelect: () => void;
}

function JournalEntryRow({ entry, selected, onSelect }: JournalEntryRowProps) {
	const format = useFormatter();
	const tokens = colorTokens(entry.planColor);
	const Icon = iconForKey(entry.planIcon);
	const passage = `${entry.bookName} ${formatReadingLogLabel({
		chapterStart: entry.chapterStart,
		chapterEnd: entry.chapterEnd,
		verseStart: entry.verseStart,
		verseEnd: entry.verseEnd,
	})}`;

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"gap-2 px-3 py-2.5 flex w-full items-start text-left transition-colors",
				selected ? "bg-accent" : "hover:bg-accent/40",
			)}
			aria-pressed={selected}
		>
			<span
				className={cn(
					"size-7 mt-0.5 flex shrink-0 items-center justify-center rounded-md",
					tokens.soft,
				)}
			>
				<Icon className={cn("size-3.5", tokens.text)} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium leading-snug truncate">{passage}</p>
				<p className="text-xs text-muted-foreground truncate">
					{entry.planTitle} ·{" "}
					{format.dateTime(new Date(entry.loggedAt), { dateStyle: "medium" })}
				</p>
				{entry.note ? (
					<p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{entry.note}</p>
				) : null}
			</div>
		</button>
	);
}

interface DateRangePopoverProps {
	value: DateRange;
	onChange: (next: DateRange) => void;
	open: boolean;
	onOpenChange: (next: boolean) => void;
}

function DateRangePopover({ value, onChange, open, onOpenChange }: DateRangePopoverProps) {
	const t = useTranslations("lectio.journalPage.filters");
	const label =
		value.from || value.to
			? `${value.from || "…"} → ${value.to || "…"}`
			: t("dateRange");

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline">
					<CalendarIcon className="mr-1.5 size-4" />
					{label}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-72 space-y-3" align="end">
				<div className="gap-1.5 grid grid-cols-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onChange(presetRange("last7"))}
					>
						{t("datePresets.last7")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onChange(presetRange("last30"))}
					>
						{t("datePresets.last30")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onChange(presetRange("thisMonth"))}
					>
						{t("datePresets.thisMonth")}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onChange(presetRange("all"))}
					>
						{t("datePresets.all")}
					</Button>
				</div>
				<div className="gap-2 grid grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="journal-date-from" className="text-xs">
							{t("from")}
						</Label>
						<Input
							id="journal-date-from"
							type="date"
							value={value.from}
							onChange={(event) => onChange({ ...value, from: event.target.value })}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="journal-date-to" className="text-xs">
							{t("to")}
						</Label>
						<Input
							id="journal-date-to"
							type="date"
							value={value.to}
							onChange={(event) => onChange({ ...value, to: event.target.value })}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface JournalInspectorProps {
	entry: JournalEntry;
	plans: PlansListResponse;
	onAfterDelete: () => void;
	toastSaved: () => void;
	toastError: () => void;
}

function JournalInspector({
	entry,
	plans,
	onAfterDelete,
	toastSaved,
	toastError,
}: JournalInspectorProps) {
	const t = useTranslations("lectio.journalPage.inspector");
	const format = useFormatter();
	const { confirm } = useConfirmationAlert();

	// Form state — defaults to the entry's current server values.
	const [mode, setMode] = useState<"view" | "edit">("view");
	const [planId, setPlanId] = useState<string>(entry.planId);
	const [planBookId, setPlanBookId] = useState<string>(entry.planBookId);
	const [chapters, setChapters] = useState<number[]>(() => {
		const list: number[] = [];
		for (let ch = entry.chapterStart; ch <= entry.chapterEnd; ch += 1) {
			list.push(ch);
		}
		return list;
	});
	const [verseStart, setVerseStart] = useState<string>(
		entry.verseStart != null ? `${entry.verseStart}` : "",
	);
	const [verseEnd, setVerseEnd] = useState<string>(
		entry.verseEnd != null ? `${entry.verseEnd}` : "",
	);
	const [note, setNote] = useState<string>(entry.note ?? "");
	const [loggedAt, setLoggedAt] = useState<string>(entry.loggedAt);

	// Reset form + mode whenever the selected entry changes.
	useEffect(() => {
		setMode("view");
		setPlanId(entry.planId);
		setPlanBookId(entry.planBookId);
		const list: number[] = [];
		for (let ch = entry.chapterStart; ch <= entry.chapterEnd; ch += 1) {
			list.push(ch);
		}
		setChapters(list);
		setVerseStart(entry.verseStart != null ? `${entry.verseStart}` : "");
		setVerseEnd(entry.verseEnd != null ? `${entry.verseEnd}` : "");
		setNote(entry.note ?? "");
		setLoggedAt(entry.loggedAt);
	}, [entry]);

	const builderQuery = usePlanBuilderQuery(planId, undefined, { enabled: !!planId });
	const planBooks = useMemo(
		() => builderQuery.data?.planBooks ?? [],
		[builderQuery.data?.planBooks],
	);

	// When the user moves the entry to another plan, default the plan-book to the
	// first available book.
	useEffect(() => {
		if (planId === entry.planId) return;
		if (planBooks.length === 0) return;
		const stillExists = planBooks.some((book) => book.id === planBookId);
		if (!stillExists) {
			setPlanBookId(planBooks[0].id);
		}
	}, [planId, entry.planId, planBooks, planBookId]);

	const selectedPlanBook = useMemo(
		() => planBooks.find((book) => book.id === planBookId),
		[planBooks, planBookId],
	);

	const availableChapters = useMemo(() => {
		if (!selectedPlanBook) return [] as number[];
		const start = selectedPlanBook.chapterStart ?? 1;
		const end = selectedPlanBook.chapterEnd ?? selectedPlanBook.book.chapterCount;
		const list: number[] = [];
		for (let ch = start; ch <= end; ch += 1) list.push(ch);
		return list;
	}, [selectedPlanBook]);

	const { data: chaptersData } = useBookChaptersQuery(selectedPlanBook?.bookId ?? null);
	const chapterMeta = useMemo(() => chaptersData?.chapters ?? [], [chaptersData?.chapters]);

	const isSingleChapter = chapters.length > 0 && chapters[0] === chapters[chapters.length - 1];
	const verseChapter = isSingleChapter ? chapters[0] : null;
	const verseChapterMeta = useMemo(
		() =>
			verseChapter != null
				? chapterMeta.find((chapter) => chapter.chapterNum === verseChapter) ?? null
				: null,
		[chapterMeta, verseChapter],
	);
	const verseOptions = useMemo(
		() =>
			verseChapterMeta
				? Array.from({ length: verseChapterMeta.verseCount }, (_, idx) => idx + 1)
				: [],
		[verseChapterMeta],
	);

	const updateMutation = useUpdateReadingLogMutation();
	const deleteMutation = useDeleteReadingLogMutation(entry.planId, entry.planBookId);

	const dirty = useMemo(() => {
		if (planBookId !== entry.planBookId) return true;
		if (loggedAt !== entry.loggedAt) return true;
		if ((note.trim() || null) !== (entry.note ?? null)) return true;
		const chapterStart = chapters[0] ?? entry.chapterStart;
		const chapterEnd = chapters[chapters.length - 1] ?? entry.chapterEnd;
		if (chapterStart !== entry.chapterStart) return true;
		if (chapterEnd !== entry.chapterEnd) return true;
		const vs = verseStart ? Number.parseInt(verseStart, 10) : null;
		const ve = verseEnd ? Number.parseInt(verseEnd, 10) : null;
		if ((vs ?? null) !== (entry.verseStart ?? null)) return true;
		if ((ve ?? null) !== (entry.verseEnd ?? null)) return true;
		return false;
	}, [
		planBookId,
		loggedAt,
		note,
		chapters,
		verseStart,
		verseEnd,
		entry.planBookId,
		entry.loggedAt,
		entry.note,
		entry.chapterStart,
		entry.chapterEnd,
		entry.verseStart,
		entry.verseEnd,
	]);

	const verseRangeValid =
		(verseStart === "" && verseEnd === "") ||
		(verseStart !== "" &&
			verseEnd !== "" &&
			isSingleChapter &&
			Number.parseInt(verseStart, 10) <= Number.parseInt(verseEnd, 10));

	const canSave = dirty && chapters.length > 0 && verseRangeValid;

	// Keep the chapter selection inside the available-chapters set whenever
	// the destination plan-book changes (so moving Genesis log to Mark won't
	// silently submit chapter 50 to a 16-chapter book).
	useEffect(() => {
		if (chapters.length === 0) return;
		if (planBookId === entry.planBookId) return;
		const filtered = chapters.filter((ch) => availableChapters.includes(ch));
		if (filtered.length !== chapters.length) {
			setChapters(filtered);
		}
	}, [planBookId, entry.planBookId, availableChapters, chapters]);

	const handleSave = async () => {
		if (!canSave) return;
		const chapterStart = chapters[0];
		const chapterEnd = chapters[chapters.length - 1];

		// Only contiguous chapters are supported by the schema today (a single row
		// has one chapterStart/End pair). We treat the picker selection as a
		// single contiguous range using its min and max.
		try {
			await updateMutation.mutateAsync({
				readingLogId: entry.id,
				planBookId: planBookId === entry.planBookId ? undefined : planBookId,
				chapterStart,
				chapterEnd,
				verseStart: verseStart ? Number.parseInt(verseStart, 10) : null,
				verseEnd: verseEnd ? Number.parseInt(verseEnd, 10) : null,
				note: note.trim() ? note.trim() : null,
				loggedAt,
			});
			toastSaved();
			setMode("view");
		} catch {
			toastError();
		}
	};

	const handleCancel = () => {
		setPlanId(entry.planId);
		setPlanBookId(entry.planBookId);
		const list: number[] = [];
		for (let ch = entry.chapterStart; ch <= entry.chapterEnd; ch += 1) {
			list.push(ch);
		}
		setChapters(list);
		setVerseStart(entry.verseStart != null ? `${entry.verseStart}` : "");
		setVerseEnd(entry.verseEnd != null ? `${entry.verseEnd}` : "");
		setNote(entry.note ?? "");
		setLoggedAt(entry.loggedAt);
		setMode("view");
	};

	const handleDelete = () => {
		confirm({
			title: t("deleteConfirmTitle"),
			message: t("deleteConfirmMessage"),
			destructive: true,
			confirmLabel: t("deleteConfirm"),
			onConfirm: async () => {
				try {
					await deleteMutation.mutateAsync({ readingLogId: entry.id });
					toastSaved();
					onAfterDelete();
				} catch {
					toastError();
				}
			},
		});
	};

	const tokens = colorTokens(entry.planColor);
	const Icon = iconForKey(entry.planIcon);
	const passageLabel = `${entry.bookName} ${formatReadingLogLabel({
		chapterStart: entry.chapterStart,
		chapterEnd: entry.chapterEnd,
		verseStart: entry.verseStart,
		verseEnd: entry.verseEnd,
	})}`;

	if (mode === "view") {
		return (
			<div className="flex h-full flex-col">
				<div className="px-4 sm:px-5 py-4 border-b space-y-1">
					<div className="gap-2 flex items-center">
						<span
							className={cn(
								"size-8 flex shrink-0 items-center justify-center rounded-md",
								tokens.soft,
							)}
						>
							<Icon className={cn("size-4", tokens.text)} />
						</span>
						<div className="min-w-0">
							<p className="text-sm font-medium truncate">{entry.planTitle}</p>
							<p className="text-xs text-muted-foreground">
								{format.dateTime(new Date(entry.loggedAt), { dateStyle: "long" })}
							</p>
						</div>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4">
					<div>
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							{t("passage")}
						</p>
						<p className="mt-1 text-xl font-semibold">{passageLabel}</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							{t("noteLabel")}
						</p>
						<NoteMarkdown
							content={entry.note}
							className="mt-2"
							emptyState={
								<p className="mt-2 text-sm italic text-muted-foreground">{t("noteEmpty")}</p>
							}
						/>
					</div>
				</div>

				<div className="px-4 sm:px-5 py-3 border-t gap-2 flex items-center justify-between">
					<Button
						type="button"
						variant="outline"
						className="text-destructive"
						onClick={handleDelete}
					>
						<Trash2Icon className="mr-1.5 size-4" />
						{t("delete")}
					</Button>
					<Button type="button" onClick={() => setMode("edit")}>
						<PencilIcon className="mr-1.5 size-4" />
						{t("edit")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="px-4 sm:px-5 py-4 border-b space-y-1">
				<div className="gap-2 flex items-center">
					<span
						className={cn(
							"size-8 flex shrink-0 items-center justify-center rounded-md",
							tokens.soft,
						)}
					>
						<Icon className={cn("size-4", tokens.text)} />
					</span>
					<div className="min-w-0">
						<p className="text-sm font-medium truncate">{entry.planTitle}</p>
						<p className="text-xs text-muted-foreground">
							{format.dateTime(new Date(entry.loggedAt), { dateStyle: "long" })}
						</p>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
				<div className="gap-3 sm:grid-cols-2 grid">
					<div className="space-y-1.5">
						<Label htmlFor="inspector-plan">{t("planLabel")}</Label>
						<Select value={planId} onValueChange={setPlanId}>
							<SelectTrigger id="inspector-plan">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{plans.map((plan) => (
									<SelectItem key={plan.id} value={plan.id}>
										{plan.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="inspector-plan-book">{t("planBookLabel")}</Label>
						<Select
							value={planBookId}
							onValueChange={setPlanBookId}
							disabled={planBooks.length === 0}
						>
							<SelectTrigger id="inspector-plan-book">
								<SelectValue
									placeholder={planBooks.length === 0 ? t("noBooks") : undefined}
								/>
							</SelectTrigger>
							<SelectContent>
								{planBooks.map((book) => (
									<SelectItem key={book.id} value={book.id}>
										{book.book.name}
										{book.chapterStart != null && book.chapterEnd != null
											? ` · ${book.chapterStart}–${book.chapterEnd}`
											: ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{selectedPlanBook ? (
					<ChapterPicker
						availableChapters={availableChapters}
						selected={chapters}
						onChange={setChapters}
						resetKey={selectedPlanBook.id}
					/>
				) : null}

				{selectedPlanBook && isSingleChapter ? (
					<div className="space-y-1.5">
						<Label>{t("verseRangeLabel")}</Label>
						<div className="gap-2 flex items-center">
							<Select
								value={verseStart || "any"}
								onValueChange={(value) => setVerseStart(value === "any" ? "" : value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("verseFrom")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="any">{t("verseAny")}</SelectItem>
									{verseOptions.map((verse) => (
										<SelectItem key={verse} value={`${verse}`}>
											{verse}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<span className="text-muted-foreground">–</span>
							<Select
								value={verseEnd || "any"}
								onValueChange={(value) => setVerseEnd(value === "any" ? "" : value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("verseTo")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="any">{t("verseAny")}</SelectItem>
									{verseOptions.map((verse) => (
										<SelectItem key={verse} value={`${verse}`}>
											{verse}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				<div className="space-y-1.5">
					<Label htmlFor="inspector-date">{t("dateLabel")}</Label>
					<Input
						id="inspector-date"
						type="date"
						value={loggedAt}
						onChange={(event) => setLoggedAt(event.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="inspector-note">{t("noteLabel")}</Label>
					<NoteEditor
						id="inspector-note"
						value={note}
						onChange={setNote}
						placeholder={t("notePlaceholder")}
						minHeight={200}
					/>
				</div>
			</div>

			<div className="px-4 sm:px-5 py-3 border-t space-y-2">
				{dirty ? (
					<p className="text-xs text-amber-700 dark:text-amber-400">{t("unsaved")}</p>
				) : null}
				<div className="gap-2 flex items-center justify-between">
					<Button
						type="button"
						variant="outline"
						className="text-destructive"
						onClick={handleDelete}
					>
						<Trash2Icon className="mr-1.5 size-4" />
						{t("delete")}
					</Button>
					<div className="gap-2 flex items-center">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={!dirty}
						>
							{t("cancel")}
						</Button>
						<Button
							type="button"
							onClick={handleSave}
							loading={updateMutation.isPending}
							disabled={!canSave}
						>
							{t("save")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
