"use client";

import { PlanBookDrawer } from "@lectio/components/PlanBookDrawer";
import { PlanStatusBadge } from "@lectio/components/PlanStatusBadge";
import {
	usePlanBuilderQuery,
	usePlanProgressQuery,
	type BuilderResponse,
	type PlanBookRow,
	type ProgressResponse,
	type ReadingLogsResponse,
} from "@lectio/hooks/use-lectio";
import { type PlanBookStatus } from "@lectio/lib/constants";
import { formatReadingLogLabel } from "@lectio/lib/reading-log";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Button,
	Card,
	Progress,
} from "@repo/ui";
import { BookOpenIcon, ChevronRightIcon, PencilLineIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { orpc } from "@shared/lib/orpc-query-utils";

interface PlanReadViewProps {
	planId: string;
	initialProgress: ProgressResponse;
	initialBuilder: BuilderResponse;
}

function percent(completed: number, total: number) {
	if (total <= 0) {
		return 0;
	}
	return Math.round((completed / total) * 100);
}

function pickSuggestedPlanBookId(books: ProgressResponse["books"]): string | null {
	const sorted = [...books].sort((a, b) => a.orderIndex - b.orderIndex);
	const inProgress = sorted.find((b) => b.status === "in_progress");
	if (inProgress) {
		return inProgress.id;
	}
	const withLog = sorted.filter((b) => b.mostRecentLog);
	if (withLog.length > 0) {
		withLog.sort(
			(a, b) =>
				new Date(b.mostRecentLog!.loggedAt).getTime() -
				new Date(a.mostRecentLog!.loggedAt).getTime(),
		);
		return withLog[0].id;
	}
	return sorted[0]?.id ?? null;
}

type RecentEntry = {
	logId: string;
	planBookId: string;
	bookName: string;
	log: ReadingLogsResponse[number];
};

export function PlanReadView({ planId, initialProgress, initialBuilder }: PlanReadViewProps) {
	const t = useTranslations("lectio");
	const format = useFormatter();
	const { data: progressData } = usePlanProgressQuery(planId, initialProgress);
	const { data: builderData } = usePlanBuilderQuery(planId, initialBuilder);
	const progress = progressData ?? initialProgress;
	const builder = builderData ?? initialBuilder;

	const [drawerPlanBookId, setDrawerPlanBookId] = useState<string | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const planBookById = useMemo(() => {
		const map = new Map<string, PlanBookRow>();
		for (const row of builder.planBooks) {
			map.set(row.id, row);
		}
		return map;
	}, [builder.planBooks]);

	const suggestedId = useMemo(() => pickSuggestedPlanBookId(progress.books), [progress.books]);
	const suggestedBook = suggestedId ? progress.books.find((b) => b.id === suggestedId) : null;
	const otherBooks = useMemo(() => {
		const sorted = progress.books.slice().sort((a, b) => a.orderIndex - b.orderIndex);
		if (!suggestedId) {
			return sorted;
		}
		return sorted.filter((b) => b.id !== suggestedId);
	}, [progress.books, suggestedId]);

	const logQueries = useQueries({
		queries: progress.books.map((book) => ({
			...orpc.lectio.readingLogs.list.queryOptions({
				input: { planId, planBookId: book.id },
			}),
			staleTime: 30_000,
		})),
	});

	const recentEntries = useMemo(() => {
		const entries: RecentEntry[] = [];
		for (let i = 0; i < progress.books.length; i += 1) {
			const bookRow = progress.books[i];
			const logs = logQueries[i]?.data;
			if (!logs?.length) {
				continue;
			}
			for (const log of logs) {
				entries.push({
					logId: log.id,
					planBookId: bookRow.id,
					bookName: bookRow.book.name,
					log,
				});
			}
		}
		entries.sort(
			(a, b) => new Date(b.log.loggedAt).getTime() - new Date(a.log.loggedAt).getTime(),
		);
		return entries.slice(0, 15);
	}, [logQueries, progress.books]);

	const isRecentLoading = logQueries.some((q) => q.isPending);

	const openDrawerFor = (planBookId: string) => {
		setDrawerPlanBookId(planBookId);
		setIsDrawerOpen(true);
	};

	const drawerPlanBook = drawerPlanBookId ? planBookById.get(drawerPlanBookId) ?? null : null;

	const completionValue = percent(progress.stats.completedBooks, progress.stats.totalBooks);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-2">
					<Link
						href="/"
						className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						{t("read.backToPlans")}
					</Link>
					<div>
						<h1 className="font-semibold text-2xl">{progress.plan.title}</h1>
						{progress.plan.description ? (
							<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
								{progress.plan.description}
							</p>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button asChild variant="outline" className="gap-2">
						<Link href={`/plans/${planId}/progress`}>{t("read.viewProgress")}</Link>
					</Button>
					<Button asChild className="gap-2">
						<Link href={`/plans/${planId}/edit`}>
							<PencilLineIcon className="size-4" />
							{t("read.editPlan")}
						</Link>
					</Button>
				</div>
			</div>

			<Card className="p-5 space-y-3">
				<div className="flex items-center justify-between gap-2 text-sm">
					<span className="font-medium">{t("read.overallProgress")}</span>
					<span className="text-muted-foreground">
						{t("read.booksCompleted", {
							completed: progress.stats.completedBooks,
							total: progress.stats.totalBooks,
						})}
					</span>
				</div>
				<Progress value={completionValue} className="h-2.5" />
			</Card>

			{progress.books.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="font-medium">{t("read.emptyPlanTitle")}</p>
					<p className="mt-1 text-sm text-muted-foreground">{t("read.emptyPlanDescription")}</p>
					<Button asChild className="mt-4">
						<Link href={`/plans/${planId}/edit`}>{t("read.addBooks")}</Link>
					</Button>
				</Card>
			) : (
				<>
					{suggestedBook ? (
						<Card className="p-5">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{t("read.suggestedLabel")}
							</p>
							<div className="mt-2 flex flex-wrap items-start justify-between gap-3">
								<div className="space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-lg font-semibold">{suggestedBook.book.name}</span>
										<PlanStatusBadge status={suggestedBook.status as PlanBookStatus} />
									</div>
									{suggestedBook.mostRecentLog ? (
										<p className="text-sm text-muted-foreground">
											{t("read.lastLogged", {
												passage: `${suggestedBook.book.name} ${formatReadingLogLabel(suggestedBook.mostRecentLog)}`,
												date: format.dateTime(new Date(suggestedBook.mostRecentLog.loggedAt), {
													dateStyle: "medium",
												}),
											})}
										</p>
									) : (
										<p className="text-sm text-muted-foreground">{t("read.noLogsYet")}</p>
									)}
								</div>
								<Button
									type="button"
									className="gap-2 shrink-0"
									onClick={() => openDrawerFor(suggestedBook.id)}
								>
									<BookOpenIcon className="size-4" />
									{t("read.logReading")}
								</Button>
							</div>
						</Card>
					) : null}

					{otherBooks.length > 0 ? (
						<Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
							<AccordionItem value="other" className="border-0">
								<AccordionTrigger className="py-4 hover:no-underline">
									<span className="font-medium">{t("read.otherBooks")}</span>
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-2 pb-2">
										{otherBooks.map((book) => (
											<li key={book.id}>
												<button
													type="button"
													onClick={() => openDrawerFor(book.id)}
													className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
												>
													<span className="flex min-w-0 flex-wrap items-center gap-2">
														<span className="truncate font-medium">{book.book.name}</span>
														<PlanStatusBadge status={book.status as PlanBookStatus} />
													</span>
													<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
												</button>
											</li>
										))}
									</ul>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					) : null}

					<div className="space-y-3">
						<h2 className="font-semibold text-base">{t("read.recentActivity")}</h2>
						{isRecentLoading ? (
							<div className="h-20 animate-pulse rounded-xl bg-muted" />
						) : recentEntries.length === 0 ? (
							<Card className="p-6 text-center text-sm text-muted-foreground">
								{t("read.recentEmpty")}
							</Card>
						) : (
							<ul className="space-y-2">
								{recentEntries.map((entry) => (
									<li key={entry.logId}>
										<Card className="p-3">
											<p className="text-sm font-medium">
												{entry.bookName} {formatReadingLogLabel(entry.log)}
											</p>
											<p className="text-xs text-muted-foreground">
												{format.dateTime(new Date(entry.log.loggedAt), { dateStyle: "medium" })}
											</p>
											{entry.log.note ? (
												<p className="mt-1 text-sm text-muted-foreground">{entry.log.note}</p>
											) : null}
										</Card>
									</li>
								))}
							</ul>
						)}
					</div>
				</>
			)}

			<PlanBookDrawer
				planId={planId}
				open={isDrawerOpen}
				onOpenChange={(open) => {
					setIsDrawerOpen(open);
					if (!open) {
						setDrawerPlanBookId(null);
					}
				}}
				planBook={drawerPlanBook}
				variant="log"
			/>
		</div>
	);
}
