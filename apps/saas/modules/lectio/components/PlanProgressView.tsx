"use client";

import { PlanStatusBadge } from "@lectio/components/PlanStatusBadge";
import { STATUS_LABELS, type PlanBookStatus } from "@lectio/lib/constants";
import { formatReadingLogLabel } from "@lectio/lib/reading-log";
import { usePlanProgressQuery, type ProgressResponse } from "@lectio/hooks/use-lectio";
import { Button, Card, Progress } from "@repo/ui";
import { ArrowLeftIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

interface PlanProgressViewProps {
	planId: string;
	initialData: ProgressResponse;
}

function percent(completed: number, total: number) {
	if (total <= 0) {
		return 0;
	}

	return Math.round((completed / total) * 100);
}

export function PlanProgressView({ planId, initialData }: PlanProgressViewProps) {
	const t = useTranslations("lectio");
	const format = useFormatter();
	const { data } = usePlanProgressQuery(planId, initialData);
	const progress = data ?? initialData;

	const completionValue = percent(progress.stats.completedBooks, progress.stats.totalBooks);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">{progress.plan.title}</h1>
					<p className="text-sm text-muted-foreground">{t("progress.subtitle")}</p>
				</div>
				<Button asChild variant="outline" className="gap-2">
					<Link href={`/plans/${planId}`}>
						<ArrowLeftIcon className="size-4" />
						{t("progress.backToBuilder")}
					</Link>
				</Button>
			</div>

			<Card className="p-5 space-y-4">
				<div className="space-y-1">
					<p className="font-medium text-sm">{t("progress.overall")}</p>
					<Progress value={completionValue} className="h-2.5" />
					<p className="text-xs text-muted-foreground">
						{t("progress.completedOfTotal", {
							completed: progress.stats.completedBooks,
							total: progress.stats.totalBooks,
						})}
					</p>
				</div>

				<div className="grid gap-3 md:grid-cols-4">
					<div className="rounded-xl border p-3">
						<p className="text-xs text-muted-foreground">{t("progress.notStarted")}</p>
						<p className="font-semibold text-xl">{progress.stats.notStartedBooks}</p>
					</div>
					<div className="rounded-xl border p-3">
						<p className="text-xs text-muted-foreground">{t("progress.inProgress")}</p>
						<p className="font-semibold text-xl">{progress.stats.inProgressBooks}</p>
					</div>
					<div className="rounded-xl border p-3">
						<p className="text-xs text-muted-foreground">{t("progress.completed")}</p>
						<p className="font-semibold text-xl">{progress.stats.completedBooks}</p>
					</div>
					<div className="rounded-xl border p-3">
						<p className="text-xs text-muted-foreground">{t("progress.chaptersLogged")}</p>
						<p className="font-semibold text-xl">{progress.stats.totalChaptersLogged}</p>
					</div>
				</div>
			</Card>

			<div className="space-y-3">
				{progress.books.length === 0 ? (
					<Card className="p-8 text-center text-sm text-muted-foreground">
						{t("progress.empty")}
					</Card>
				) : (
					progress.books.map((book) => (
						<Card key={book.id} className="p-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="space-y-1">
									<div className="flex items-center gap-2">
									<PlanStatusBadge status={book.status as PlanBookStatus} />
										<span className="font-semibold">{book.book.name}</span>
									</div>
									<p className="text-xs text-muted-foreground">
										{t("progress.statusLabel", {
										status: t(STATUS_LABELS[book.status as PlanBookStatus]),
										})}
									</p>
									{book.resourceLabel && book.resourceUrl ? (
										<a
											href={book.resourceUrl}
											target="_blank"
											rel="noreferrer"
											className="text-sm text-primary underline-offset-2 hover:underline"
										>
											{book.resourceLabel}
										</a>
									) : null}
								</div>

								<div className="grid gap-1 text-right text-xs text-muted-foreground">
									<p>
										{t("progress.logEntries", {
											count: book.logCount,
										})}
									</p>
									{book.startedAt ? (
										<p>
											{t("progress.startedAt", {
												date: format.dateTime(new Date(book.startedAt), {
													dateStyle: "medium",
												}),
											})}
										</p>
									) : null}
									{book.completedAt ? (
										<p>
											{t("progress.completedAt", {
												date: format.dateTime(new Date(book.completedAt), {
													dateStyle: "medium",
												}),
											})}
										</p>
									) : null}
								</div>
							</div>

							{book.mostRecentLog ? (
								<div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
									<strong className="mr-1 font-medium text-foreground">
										{t("progress.latestLog")}:
									</strong>
									{`${book.book.name} ${formatReadingLogLabel(book.mostRecentLog)}`}
								</div>
							) : null}
						</Card>
					))
				)}
			</div>
		</div>
	);
}
