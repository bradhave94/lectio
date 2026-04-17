"use client";

import { useLogReading } from "@lectio/components/LogReadingProvider";
import { ReadingActivityFeed } from "@lectio/components/ReadingActivityFeed";
import {
	useDeleteReadingLogMutation,
	useUserRecentReadingLogsQuery,
	type PlansListResponse,
	type RecentLogsResponse,
} from "@lectio/hooks/use-lectio";
import {
	Button,
	Card,
	cn,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { ArrowDownNarrowWideIcon, ArrowUpNarrowWideIcon, BookOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface JournalViewProps {
	initialPlans: PlansListResponse;
	initialEntries: RecentLogsResponse;
}

type SortDirection = "newest" | "oldest";

export function JournalView({ initialPlans, initialEntries }: JournalViewProps) {
	const t = useTranslations("lectio.journalPage");
	const tToast = useTranslations("lectio.toast");
	const { openLogReading } = useLogReading();

	const entriesQuery = useUserRecentReadingLogsQuery(initialEntries, 200);
	const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

	const [planId, setPlanId] = useState<string>("");
	const [bookName, setBookName] = useState<string>("");
	const [from, setFrom] = useState<string>("");
	const [to, setTo] = useState<string>("");
	const [sort, setSort] = useState<SortDirection>("newest");

	const planOptions = initialPlans;

	const planFilteredEntries = useMemo(
		() => (planId ? allEntries.filter((entry) => entry.planId === planId) : allEntries),
		[allEntries, planId],
	);

	const bookOptions = useMemo(() => {
		const set = new Set<string>();
		for (const entry of planFilteredEntries) {
			set.add(entry.bookName);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [planFilteredEntries]);

	const filteredEntries = useMemo(() => {
		const fromDate = from ? new Date(from).getTime() : null;
		const toDate = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

		const filtered = planFilteredEntries.filter((entry) => {
			if (bookName && entry.bookName !== bookName) return false;
			const ts = new Date(entry.loggedAt).getTime();
			if (fromDate !== null && ts < fromDate) return false;
			if (toDate !== null && ts > toDate) return false;
			return true;
		});

		const sorted = filtered.slice().sort((left, right) => {
			const lt = new Date(left.loggedAt).getTime();
			const rt = new Date(right.loggedAt).getTime();
			if (lt !== rt) {
				return sort === "newest" ? rt - lt : lt - rt;
			}
			const lc = new Date(left.createdAt).getTime();
			const rc = new Date(right.createdAt).getTime();
			return sort === "newest" ? rc - lc : lc - rc;
		});

		return sorted;
	}, [planFilteredEntries, bookName, from, to, sort]);

	const planFilterActive = planId !== "";
	const bookFilterActive = bookName !== "";
	const dateFilterActive = from !== "" || to !== "";
	const filtersActive = planFilterActive || bookFilterActive || dateFilterActive;

	const handleClear = () => {
		setPlanId("");
		setBookName("");
		setFrom("");
		setTo("");
	};

	// Use a single mutation hook scoped to the per-plan-book query keys it
	// already invalidates; for the cross-plan view we just refetch the user
	// recent feed afterwards via onSuccess.
	const deleteLogMutation = useDeleteReadingLogMutation("", "");

	const handleDelete = async (entry: RecentLogsResponse[number]) => {
		try {
			await deleteLogMutation.mutateAsync({ readingLogId: entry.id });
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	return (
		<div className="space-y-6">
			<div className="gap-3 flex flex-wrap items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
				</div>
				<Button type="button" onClick={() => openLogReading()} disabled={planOptions.length === 0}>
					<BookOpenIcon className="mr-1.5 size-4" />
					{t("logReading")}
				</Button>
			</div>

			<Card className="p-4 sm:p-5 space-y-3">
				<div className="gap-3 grid sm:grid-cols-2 lg:grid-cols-5">
					<div className="space-y-1.5">
						<Label htmlFor="journal-plan">{t("filters.plan")}</Label>
						<Select
							value={planId || "ALL"}
							onValueChange={(value) => {
								setPlanId(value === "ALL" ? "" : value);
								setBookName("");
							}}
						>
							<SelectTrigger id="journal-plan">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">{t("filters.allPlans")}</SelectItem>
								{planOptions.map((plan) => (
									<SelectItem key={plan.id} value={plan.id}>
										{plan.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="journal-book">{t("filters.book")}</Label>
						<Select
							value={bookName || "ALL"}
							onValueChange={(value) => setBookName(value === "ALL" ? "" : value)}
							disabled={bookOptions.length === 0}
						>
							<SelectTrigger id="journal-book">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">{t("filters.allBooks")}</SelectItem>
								{bookOptions.map((book) => (
									<SelectItem key={book} value={book}>
										{book}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="journal-from">{t("filters.from")}</Label>
						<Input
							id="journal-from"
							type="date"
							value={from}
							onChange={(event) => setFrom(event.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="journal-to">{t("filters.to")}</Label>
						<Input
							id="journal-to"
							type="date"
							value={to}
							onChange={(event) => setTo(event.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>{t("filters.sort")}</Label>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-between"
							onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))}
						>
							{sort === "newest" ? t("filters.newestFirst") : t("filters.oldestFirst")}
							{sort === "newest" ? (
								<ArrowDownNarrowWideIcon className="size-4 opacity-60" />
							) : (
								<ArrowUpNarrowWideIcon className="size-4 opacity-60" />
							)}
						</Button>
					</div>
				</div>

				<div className="gap-2 flex items-center justify-between">
					<p className="text-xs text-muted-foreground">
						{t("counts", {
							shown: filteredEntries.length,
							total: allEntries.length,
						})}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleClear}
						disabled={!filtersActive}
						className={cn(!filtersActive && "opacity-0 pointer-events-none")}
					>
						{t("filters.clear")}
					</Button>
				</div>
			</Card>

			<ReadingActivityFeed
				entries={filteredEntries}
				isLoading={entriesQuery.isPending}
				showPlanLabel
				emptyMessage={filtersActive ? t("emptyFiltered") : t("empty")}
				onDelete={handleDelete}
			/>
		</div>
	);
}
