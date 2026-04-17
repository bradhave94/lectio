"use client";

import {
	useBookChaptersQuery,
	useLectioPlansQuery,
	useLogReadingMutation,
	usePlanBuilderQuery,
} from "@lectio/hooks/use-lectio";
import { colorTokens } from "@lectio/lib/constants";
import { formatChapterListLabel } from "@lectio/lib/reading-log";
import {
	Button,
	cn,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { BookOpenIcon, CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface LogReadingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultPlanId?: string;
	defaultPlanBookId?: string;
}

interface ChapterRange {
	start: number;
	end: number;
}

function getTodayDateString() {
	const now = new Date();
	const year = now.getFullYear();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Parses a free-form chapter list, e.g. `"1, 3, 5-7"` into a list of inclusive
 * chapter ranges. Returns `null` if the input is malformed (so the caller can
 * highlight the input).
 */
function parseChapterExpression(input: string): ChapterRange[] | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return [];
	}

	const tokens = trimmed
		.split(/[,\s]+/)
		.map((token) => token.trim())
		.filter(Boolean);

	const ranges: ChapterRange[] = [];
	for (const token of tokens) {
		const rangeMatch = token.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
		if (rangeMatch) {
			const start = Number.parseInt(rangeMatch[1], 10);
			const end = Number.parseInt(rangeMatch[2], 10);
			if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
				return null;
			}
			ranges.push({ start, end });
			continue;
		}

		if (!/^\d+$/.test(token)) {
			return null;
		}
		const chapter = Number.parseInt(token, 10);
		if (!Number.isInteger(chapter) || chapter < 1) {
			return null;
		}
		ranges.push({ start: chapter, end: chapter });
	}

	return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

function chaptersFromRanges(ranges: ChapterRange[]): number[] {
	const set = new Set<number>();
	for (const range of ranges) {
		for (let ch = range.start; ch <= range.end; ch += 1) {
			set.add(ch);
		}
	}
	return Array.from(set).sort((a, b) => a - b);
}

function rangesFromChapters(chapters: number[]): ChapterRange[] {
	if (chapters.length === 0) {
		return [];
	}
	const sorted = Array.from(new Set(chapters)).sort((a, b) => a - b);
	const result: ChapterRange[] = [];
	let current = { start: sorted[0], end: sorted[0] };
	for (let i = 1; i < sorted.length; i += 1) {
		if (sorted[i] === current.end + 1) {
			current.end = sorted[i];
			continue;
		}
		result.push(current);
		current = { start: sorted[i], end: sorted[i] };
	}
	result.push(current);
	return result;
}

export function LogReadingDialog({
	open,
	onOpenChange,
	defaultPlanId,
	defaultPlanBookId,
}: LogReadingDialogProps) {
	const t = useTranslations("lectio.logDialog");
	const tToast = useTranslations("lectio.toast");

	const plansQuery = useLectioPlansQuery();
	const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);

	const [planId, setPlanId] = useState<string | undefined>(defaultPlanId);
	const [planBookId, setPlanBookId] = useState<string | undefined>(defaultPlanBookId);
	const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
	const [chapterText, setChapterText] = useState("");
	const [chapterTextError, setChapterTextError] = useState(false);
	const [verseStart, setVerseStart] = useState<string>("");
	const [verseEnd, setVerseEnd] = useState<string>("");
	const [note, setNote] = useState("");
	const [loggedAt, setLoggedAt] = useState<string>(getTodayDateString());

	useEffect(() => {
		if (!open) {
			return;
		}
		// Reset form when opening, applying any incoming defaults.
		setPlanId(defaultPlanId ?? undefined);
		setPlanBookId(defaultPlanBookId ?? undefined);
		setSelectedChapters([]);
		setChapterText("");
		setChapterTextError(false);
		setVerseStart("");
		setVerseEnd("");
		setNote("");
		setLoggedAt(getTodayDateString());
	}, [open, defaultPlanId, defaultPlanBookId]);

	// If no plan id supplied and there's exactly one plan, pre-select it.
	useEffect(() => {
		if (planId || plans.length === 0) {
			return;
		}
		if (plans.length === 1) {
			setPlanId(plans[0].id);
		}
	}, [planId, plans]);

	const builderQuery = usePlanBuilderQuery(planId ?? "", undefined, {
		enabled: Boolean(planId),
	});
	const planBooks = useMemo(
		() => builderQuery.data?.planBooks ?? [],
		[builderQuery.data?.planBooks],
	);

	useEffect(() => {
		if (!planId) {
			return;
		}
		// Auto-pick the first book if none selected (and we have at least one).
		if (!planBookId && planBooks.length > 0) {
			setPlanBookId(planBooks[0].id);
		}
	}, [planId, planBookId, planBooks]);

	const selectedPlanBook = useMemo(
		() => planBooks.find((book) => book.id === planBookId),
		[planBooks, planBookId],
	);

	const availableChapters = useMemo(() => {
		if (!selectedPlanBook) {
			return [] as number[];
		}
		const start = selectedPlanBook.chapterStart ?? 1;
		const end = selectedPlanBook.chapterEnd ?? selectedPlanBook.book.chapterCount;
		const list: number[] = [];
		for (let ch = start; ch <= end; ch += 1) {
			list.push(ch);
		}
		return list;
	}, [selectedPlanBook]);

	// Reset chapter selection whenever the book changes.
	useEffect(() => {
		setSelectedChapters([]);
		setChapterText("");
		setChapterTextError(false);
		setVerseStart("");
		setVerseEnd("");
	}, [planBookId]);

	const { data: chaptersData } = useBookChaptersQuery(selectedPlanBook?.bookId ?? null);
	const chapterMeta = useMemo(() => chaptersData?.chapters ?? [], [chaptersData?.chapters]);

	const isSingleChapter = selectedChapters.length === 1;
	const verseChapter = isSingleChapter ? selectedChapters[0] : null;
	const verseChapterMeta = useMemo(() => {
		if (verseChapter == null) {
			return null;
		}
		return chapterMeta.find((chapter) => chapter.chapterNum === verseChapter) ?? null;
	}, [chapterMeta, verseChapter]);

	const verseOptions = useMemo(() => {
		if (!verseChapterMeta) {
			return [];
		}
		return Array.from({ length: verseChapterMeta.verseCount }, (_, idx) => idx + 1);
	}, [verseChapterMeta]);

	const handleToggleChapter = (chapter: number) => {
		setSelectedChapters((current) => {
			const exists = current.includes(chapter);
			const next = exists ? current.filter((value) => value !== chapter) : [...current, chapter];
			next.sort((a, b) => a - b);
			const nextRanges = rangesFromChapters(next);
			setChapterText(formatChapterListLabel(nextRanges));
			setChapterTextError(false);
			return next;
		});
	};

	const handleChapterTextChange = (value: string) => {
		setChapterText(value);
		const parsed = parseChapterExpression(value);
		if (parsed === null) {
			setChapterTextError(true);
			return;
		}

		setChapterTextError(false);
		const flattened = chaptersFromRanges(parsed);
		const filtered = flattened.filter((chapter) => availableChapters.includes(chapter));
		setSelectedChapters(filtered);
	};

	const logMutation = useLogReadingMutation();

	const canSubmit =
		!!planId &&
		!!planBookId &&
		selectedChapters.length > 0 &&
		!chapterTextError &&
		(verseStart === "" ||
			verseEnd === "" ||
			(isSingleChapter &&
				verseStart !== "" &&
				verseEnd !== "" &&
				Number.parseInt(verseStart, 10) <= Number.parseInt(verseEnd, 10)));

	const handleSubmit = async () => {
		if (!planId || !planBookId) {
			return;
		}
		if (selectedChapters.length === 0) {
			toastError(t("missingChapters"));
			return;
		}

		const chapters = rangesFromChapters(selectedChapters);
		const parsedStart = verseStart ? Number.parseInt(verseStart, 10) : undefined;
		const parsedEnd = verseEnd ? Number.parseInt(verseEnd, 10) : undefined;

		try {
			await logMutation.mutateAsync({
				planId,
				planBookId,
				chapters: chapters.map((range) => ({ start: range.start, end: range.end })),
				verseStart: parsedStart,
				verseEnd: parsedEnd,
				note: note.trim() ? note.trim() : undefined,
				loggedAt,
			});
			toastSuccess(tToast("saved"));
			onOpenChange(false);
		} catch {
			// onError handler already toasted.
		}
	};

	const planChoiceColor = colorTokens(plans.find((plan) => plan.id === planId)?.color ?? null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[640px] flex max-h-[90vh] flex-col">
				<DialogHeader>
					<DialogTitle className="gap-2 flex items-center">
						<BookOpenIcon className="size-5" />
						{t("title")}
					</DialogTitle>
					<DialogDescription>{t("subtitle")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 pr-1 -mr-1 overflow-y-auto">
					{/* Plan picker */}
					<div className="space-y-1.5">
						<Label htmlFor="log-plan">{t("planLabel")}</Label>
						{plans.length === 0 ? (
							<p className="text-sm px-3 py-2 rounded-md border border-dashed text-muted-foreground">
								{t("noPlans")}
							</p>
						) : (
							<Select
								value={planId ?? ""}
								onValueChange={(value) => {
									setPlanId(value || undefined);
									setPlanBookId(undefined);
								}}
							>
								<SelectTrigger id="log-plan" className={cn("w-full", planChoiceColor.border)}>
									<SelectValue placeholder={t("planPlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									{plans.map((plan) => {
										const tokens = colorTokens(plan.color);
										return (
											<SelectItem key={plan.id} value={plan.id}>
												<span className="gap-2 flex items-center">
													<span className={cn("size-2 rounded-full", tokens.dot)} />
													{plan.title}
												</span>
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Book picker */}
					<div className="space-y-1.5">
						<Label htmlFor="log-book">{t("bookLabel")}</Label>
						<Select
							value={planBookId ?? ""}
							onValueChange={(value) => setPlanBookId(value || undefined)}
							disabled={!planId || planBooks.length === 0}
						>
							<SelectTrigger id="log-book" className="w-full">
								<SelectValue
									placeholder={
										!planId
											? t("bookPlaceholderNoPlan")
											: planBooks.length === 0
												? t("bookPlaceholderEmpty")
												: t("bookPlaceholder")
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{planBooks.map((book) => {
									const scope =
										book.chapterStart != null && book.chapterEnd != null
											? ` · ${book.chapterStart}–${book.chapterEnd}`
											: "";
									return (
										<SelectItem key={book.id} value={book.id}>
											{book.book.name}
											{scope}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>

					{/* Chapter chips + text */}
					{selectedPlanBook ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="log-chapter-text">
									{t("chaptersLabel")}
									<span className="ml-2 text-xs font-normal text-muted-foreground">
										{t("chaptersHelper")}
									</span>
								</Label>
								<span className="text-xs text-muted-foreground">
									{t("chaptersSelected", { count: selectedChapters.length })}
								</span>
							</div>
							<Input
								id="log-chapter-text"
								value={chapterText}
								onChange={(event) => handleChapterTextChange(event.target.value)}
								placeholder="1, 3, 5-7"
								className={cn(chapterTextError && "border-destructive")}
							/>
							{chapterTextError ? (
								<p className="text-xs text-destructive">{t("invalidRange")}</p>
							) : null}
							<div className="gap-1.5 pt-1 sm:grid-cols-10 grid grid-cols-8">
								{availableChapters.map((chapter) => {
									const selected = selectedChapters.includes(chapter);
									return (
										<button
											key={chapter}
											type="button"
											onClick={() => handleToggleChapter(chapter)}
											className={cn(
												"h-9 text-sm font-medium relative rounded-md border transition-colors",
												selected
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-background hover:bg-accent",
											)}
										>
											{chapter}
											{selected ? (
												<CheckIcon className="right-0.5 top-0.5 size-2.5 absolute opacity-70" />
											) : null}
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					{/* Verse range (single chapter only) */}
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

					{/* Note */}
					<div className="space-y-1.5">
						<Label htmlFor="log-note">{t("noteLabel")}</Label>
						<Textarea
							id="log-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder={t("notePlaceholder")}
							rows={4}
						/>
					</div>

					{/* Date */}
					<div className="space-y-1.5">
						<Label htmlFor="log-date">{t("dateLabel")}</Label>
						<Input
							id="log-date"
							type="date"
							value={loggedAt}
							onChange={(event) => setLoggedAt(event.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
						{t("cancel")}
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						loading={logMutation.isPending}
					>
						{t("submit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
