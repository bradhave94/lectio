"use client";

import { ChapterPicker, rangesFromChapters } from "@lectio/components/ChapterPicker";
import {
	useBookChaptersQuery,
	useLectioPlansQuery,
	useLogReadingMutation,
	usePlanBuilderQuery,
} from "@lectio/hooks/use-lectio";
import { colorTokens } from "@lectio/lib/constants";
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
import { BookOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface LogReadingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultPlanId?: string;
	defaultPlanBookId?: string;
}

function getTodayDateString() {
	const now = new Date();
	const year = now.getFullYear();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
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

	const logMutation = useLogReadingMutation();

	const canSubmit =
		!!planId &&
		!!planBookId &&
		selectedChapters.length > 0 &&
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

					{/* Chapter chips + text (shift-click to select a range) */}
					{selectedPlanBook ? (
						<ChapterPicker
							availableChapters={availableChapters}
							selected={selectedChapters}
							onChange={setSelectedChapters}
							resetKey={selectedPlanBook.id}
						/>
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
