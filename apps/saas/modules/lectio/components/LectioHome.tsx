"use client";

import { useLogReading } from "@lectio/components/LogReadingProvider";
import { NewPlanButton } from "@lectio/components/NewPlanButton";
import { PlanCard } from "@lectio/components/PlanCard";
import { ReadingActivityFeed } from "@lectio/components/ReadingActivityFeed";
import { ReadingHeatmap } from "@lectio/components/ReadingHeatmap";
import { StatsRow } from "@lectio/components/StatsRow";
import { VerseOfDayBanner } from "@lectio/components/VerseOfDayBanner";
import {
	useDeletePlanMutation,
	useLectioPlansQuery,
	useStatsActivityQuery,
	useUserRecentReadingLogsQuery,
	type PlansListResponse,
	type RecentLogsResponse,
	type StatsActivityResponse,
	type StatsDailyGoalResponse,
	type StatsStreakResponse,
	type VerseOfDayResponse,
} from "@lectio/hooks/use-lectio";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Button,
	Card,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { BookOpenIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface LectioHomeProps {
	initialPlans: PlansListResponse;
	initialArchivedPlans: PlansListResponse;
	initialRecentLogs: RecentLogsResponse;
	verseOfDay: VerseOfDayResponse;
	initialStreak: StatsStreakResponse;
	initialActivity: StatsActivityResponse;
	initialDailyGoal: StatsDailyGoalResponse;
}

export function LectioHome({
	initialPlans,
	initialArchivedPlans,
	initialRecentLogs,
	verseOfDay,
	initialStreak,
	initialActivity,
	initialDailyGoal,
}: LectioHomeProps) {
	const t = useTranslations("lectio.home");
	const tToast = useTranslations("lectio.toast");
	const { openLogReading } = useLogReading();
	const { confirm } = useConfirmationAlert();
	const deletePlan = useDeletePlanMutation();

	const plansQuery = useLectioPlansQuery(initialPlans, false);
	const allPlansQuery = useLectioPlansQuery(initialArchivedPlans, true);
	const recentLogsQuery = useUserRecentReadingLogsQuery(initialRecentLogs, 50);

	const activePlans = plansQuery.data ?? [];
	const allPlans = allPlansQuery.data ?? [];
	const archivedPlans = allPlans.filter((plan) => plan.archivedAt !== null);
	const recentLogs = recentLogsQuery.data ?? [];
	const activityQuery = useStatsActivityQuery(initialActivity);
	const activity = activityQuery.data ?? initialActivity;

	const handleDelete = (planId: string) => {
		confirm({
			title: t("delete.title"),
			message: t("delete.message"),
			destructive: true,
			confirmLabel: t("delete.confirm"),
			onConfirm: async () => {
				try {
					await deletePlan.mutateAsync({ planId });
					toastSuccess(tToast("saved"));
				} catch {
					toastError(tToast("saveError"));
				}
			},
		});
	};

	const hasNoPlans = activePlans.length === 0 && archivedPlans.length === 0;

	return (
		<div className="space-y-8">
			<div className="gap-3 flex flex-wrap items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
				</div>
				<div className="gap-2 flex flex-wrap items-center">
					<NewPlanButton />
					<Button type="button" onClick={() => openLogReading()} disabled={hasNoPlans}>
						<BookOpenIcon className="mr-1.5 size-4" />
						{t("logReading")}
					</Button>
				</div>
			</div>

			<VerseOfDayBanner verseOfDay={verseOfDay} />

			{!hasNoPlans ? (
				<>
					<StatsRow initialStreak={initialStreak} initialDailyGoal={initialDailyGoal} />
					<Card className="p-4 sm:p-5">
						<ReadingHeatmap data={activity} />
					</Card>
				</>
			) : null}

			{hasNoPlans ? (
				<Card className="p-10 space-y-3 text-center">
					<SparklesIcon className="size-8 mx-auto text-muted-foreground" />
					<div>
						<p className="text-lg font-semibold">{t("emptyTitle")}</p>
						<p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
					</div>
					<NewPlanButton variant="primary" />
				</Card>
			) : (
				<>
					{activePlans.length > 0 ? (
						<section className="space-y-3">
							<h2 className="font-semibold text-base">{t("plansTitle")}</h2>
							<div className="gap-3 md:grid-cols-2 xl:grid-cols-3 grid">
								{activePlans.map((plan) => (
									<PlanCard
										key={plan.id}
										plan={plan}
										onLog={() => openLogReading({ planId: plan.id })}
										onDelete={() => handleDelete(plan.id)}
									/>
								))}
							</div>
						</section>
					) : null}

					{archivedPlans.length > 0 ? (
						<Accordion type="single" collapsible className="px-4 rounded-lg border bg-card">
							<AccordionItem value="archived" className="border-0">
								<AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
									{t("archivedTitle", { count: archivedPlans.length })}
								</AccordionTrigger>
								<AccordionContent>
									<div className="gap-3 pb-2 md:grid-cols-2 xl:grid-cols-3 grid">
										{archivedPlans.map((plan) => (
											<PlanCard
												key={plan.id}
												plan={plan}
												archived
												onLog={() => openLogReading({ planId: plan.id })}
												onDelete={() => handleDelete(plan.id)}
											/>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					) : null}

					<section className="space-y-3">
						<div className="gap-2 flex items-center justify-between">
							<h2 className="font-semibold text-base">{t("recentTitle")}</h2>
							<Button type="button" variant="ghost" size="sm" onClick={() => openLogReading()}>
								<BookOpenIcon className="mr-1.5 size-4" />
								{t("logReading")}
							</Button>
						</div>
						<ReadingActivityFeed
							entries={recentLogs}
							isLoading={recentLogsQuery.isPending}
							showPlanLabel
						/>
					</section>
				</>
			)}
		</div>
	);
}
