"use client";

import { useLogReading } from "@lectio/components/LogReadingProvider";
import { PlanStatusBadge } from "@lectio/components/PlanStatusBadge";
import { ReadingActivityFeed } from "@lectio/components/ReadingActivityFeed";
import {
	useDeletePlanMutation,
	useDeleteReadingLogMutation,
	usePlanBuilderQuery,
	usePlanRecentReadingLogsQuery,
	useUpdatePlanMutation,
	type BuilderResponse,
	type PlanBookRow,
	type PlanRecentLogsResponse,
	type RecentLogsResponse,
} from "@lectio/hooks/use-lectio";
import { colorTokens, iconForKey } from "@lectio/lib/constants";
import {
	Button,
	Card,
	cn,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Progress,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import {
	ArchiveIcon,
	BookOpenIcon,
	MoreHorizontalIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PlanJournalViewProps {
	planId: string;
	initialBuilder: BuilderResponse;
	initialRecentLogs: PlanRecentLogsResponse;
}

function percent(completed: number, total: number) {
	if (total <= 0) return 0;
	return Math.round((completed / total) * 100);
}

export function PlanJournalView({
	planId,
	initialBuilder,
	initialRecentLogs,
}: PlanJournalViewProps) {
	const t = useTranslations("lectio.journal");
	const tStatus = useTranslations("lectio.status");
	const tToast = useTranslations("lectio.toast");
	const format = useFormatter();
	const router = useRouter();
	const { confirm } = useConfirmationAlert();
	const { openLogReading } = useLogReading();

	const builderQuery = usePlanBuilderQuery(planId, initialBuilder);
	const builder = builderQuery.data ?? initialBuilder;

	const logsQuery = usePlanRecentReadingLogsQuery(planId, initialRecentLogs, 50);
	const logs = logsQuery.data ?? [];

	const updatePlan = useUpdatePlanMutation(planId);
	const deletePlan = useDeletePlanMutation();
	const tokens = colorTokens(builder.plan.color);
	const Icon = iconForKey(builder.plan.icon);

	const overall = percent(builder.stats.chaptersCovered, builder.stats.chaptersInScope);
	const isArchived = !!builder.plan.archivedAt;

	const handleArchiveToggle = async () => {
		try {
			await updatePlan.mutateAsync({ planId, archived: !isArchived });
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleDelete = () => {
		confirm({
			title: t("delete.title"),
			message: t("delete.message"),
			destructive: true,
			confirmLabel: t("delete.confirm"),
			onConfirm: async () => {
				try {
					await deletePlan.mutateAsync({ planId });
					toastSuccess(tToast("saved"));
					router.push("/");
				} catch {
					toastError(tToast("saveError"));
				}
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="gap-3 flex flex-wrap items-start justify-between">
				<div className="space-y-2">
					<Link
						href="/"
						className="text-sm inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
					>
						{t("backToHome")}
					</Link>
					<div className="gap-3 flex items-start">
						<span
							className={cn(
								"size-12 flex shrink-0 items-center justify-center rounded-lg border",
								tokens.border,
								tokens.soft,
							)}
						>
							<Icon className={cn("size-6", tokens.text)} />
						</span>
						<div>
							<h1 className="text-2xl font-semibold">{builder.plan.title}</h1>
							{builder.plan.description ? (
								<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
									{builder.plan.description}
								</p>
							) : null}
							<div className="mt-2 gap-2 text-xs flex flex-wrap items-center text-muted-foreground">
								{builder.plan.startDate ? (
									<span>
										{t("startedOn", {
											date: format.dateTime(new Date(builder.plan.startDate), {
												dateStyle: "medium",
											}),
										})}
									</span>
								) : null}
								{builder.plan.targetEndDate ? (
									<span>
										·{" "}
										{t("targetOn", {
											date: format.dateTime(new Date(builder.plan.targetEndDate), {
												dateStyle: "medium",
											}),
										})}
									</span>
								) : null}
								{builder.plan.cadence ? <span>· {builder.plan.cadence}</span> : null}
								{isArchived ? (
									<span className="px-2 py-0.5 rounded-full bg-muted">{t("archivedBadge")}</span>
								) : null}
							</div>
						</div>
					</div>
				</div>
				<div className="gap-2 flex flex-wrap items-center">
					<Button
						type="button"
						onClick={() => openLogReading({ planId })}
						disabled={builder.planBooks.length === 0}
					>
						<BookOpenIcon className="mr-1.5 size-4" />
						{t("logReading")}
					</Button>
					<Button asChild type="button" variant="outline">
						<Link href={`/plans/${planId}/edit`}>
							<PencilIcon className="mr-1.5 size-4" />
							{t("editPlan")}
						</Link>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline" size="icon" aria-label={t("menu")}>
								<MoreHorizontalIcon className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleArchiveToggle}>
								<ArchiveIcon className="mr-2 size-4" />
								{isArchived ? t("unarchive") : t("archive")}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleDelete} className="text-destructive">
								<Trash2Icon className="mr-2 size-4" />
								{t("deletePlan")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<Card className="p-5 space-y-4">
				<div className="space-y-1.5">
					<div className="text-sm flex items-center justify-between">
						<span className="font-medium">{t("overall")}</span>
						<span className="text-muted-foreground">
							{t("chaptersCovered", {
								covered: builder.stats.chaptersCovered,
								total: builder.stats.chaptersInScope,
							})}
						</span>
					</div>
					<Progress value={overall} className="h-2" />
				</div>
				<div className="gap-2 sm:grid-cols-4 grid">
					{(
						[
							{ key: "not_started", value: builder.stats.notStartedBooks },
							{ key: "in_progress", value: builder.stats.inProgressBooks },
							{ key: "completed", value: builder.stats.completedBooks },
						] as const
					).map((item) => (
						<div key={item.key} className="p-3 rounded-md border">
							<p className="text-xs text-muted-foreground">{tStatus(item.key)}</p>
							<p className="text-xl font-semibold">{item.value}</p>
						</div>
					))}
					<div className="p-3 rounded-md border">
						<p className="text-xs text-muted-foreground">{t("totalLogs")}</p>
						<p className="text-xl font-semibold">{builder.stats.totalLogs}</p>
					</div>
				</div>
			</Card>

			<section className="space-y-3">
				<h2 className="font-semibold text-base">{t("books")}</h2>
				{builder.planBooks.length === 0 ? (
					<Card className="p-8 space-y-3 text-center">
						<p className="font-medium">{t("emptyBooksTitle")}</p>
						<p className="text-sm text-muted-foreground">{t("emptyBooksHint")}</p>
						<Button asChild type="button">
							<Link href={`/plans/${planId}/edit`}>{t("addBooks")}</Link>
						</Button>
					</Card>
				) : (
					<ul className="space-y-2">
						{builder.planBooks.map((planBook) => (
							<li key={planBook.id}>
								<PlanBookProgressRow
									planBook={planBook}
									onLog={() => openLogReading({ planId, planBookId: planBook.id })}
								/>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="space-y-3">
				<h2 className="font-semibold text-base">{t("activity")}</h2>
				<JournalActivity planId={planId} entries={logs} isLoading={logsQuery.isPending} />
			</section>
		</div>
	);
}

function JournalActivity({
	planId,
	entries,
	isLoading,
}: {
	planId: string;
	entries: PlanRecentLogsResponse;
	isLoading: boolean;
}) {
	const t = useTranslations("lectio.journal");
	const tToast = useTranslations("lectio.toast");
	const deleteLog = useDeleteReadingLogMutation(planId, "");

	const handleDelete = async (entry: RecentLogsResponse[number]) => {
		try {
			await deleteLog.mutateAsync({ readingLogId: entry.id });
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	return (
		<ReadingActivityFeed
			entries={entries}
			isLoading={isLoading}
			emptyMessage={t("activityEmpty")}
			onDelete={handleDelete}
		/>
	);
}

function PlanBookProgressRow({ planBook, onLog }: { planBook: PlanBookRow; onLog: () => void }) {
	const t = useTranslations("lectio");
	const completion = percent(planBook.chaptersCovered, planBook.chaptersInScope);
	const scopeLabel =
		planBook.chapterStart != null && planBook.chapterEnd != null
			? t("editor.scope.range", {
					start: planBook.chapterStart,
					end: planBook.chapterEnd,
				})
			: t("editor.scope.whole");

	return (
		<Card className="p-3 space-y-2">
			<div className="gap-3 flex items-start justify-between">
				<div className="min-w-0">
					<div className="gap-2 flex items-center">
						<p className="font-medium truncate">{planBook.book.name}</p>
						<PlanStatusBadge
							status={planBook.status as "not_started" | "in_progress" | "completed"}
						/>
					</div>
					<p className="text-xs text-muted-foreground">{scopeLabel}</p>
				</div>
				<Button type="button" size="sm" variant="outline" onClick={onLog}>
					<BookOpenIcon className="mr-1.5 size-4" />
					{t("journal.log")}
				</Button>
			</div>
			<div className="space-y-1">
				<Progress value={completion} className="h-1.5" />
				<p className="text-xs text-muted-foreground">
					{t("journal.chaptersOf", {
						covered: planBook.chaptersCovered,
						total: planBook.chaptersInScope,
					})}
				</p>
			</div>
		</Card>
	);
}
