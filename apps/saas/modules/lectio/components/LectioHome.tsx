"use client";

import { useLogReading } from "@lectio/components/LogReadingProvider";
import { PlanCard } from "@lectio/components/PlanCard";
import { PlanComposerDialog } from "@lectio/components/PlanComposerDialog";
import { ReadingActivityFeed } from "@lectio/components/ReadingActivityFeed";
import { VerseOfDayBanner } from "@lectio/components/VerseOfDayBanner";
import {
	useDeletePlanMutation,
	useLectioPlansQuery,
	useUserRecentReadingLogsQuery,
	type PlansListResponse,
	type RecentLogsResponse,
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
import { BookOpenIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface LectioHomeProps {
	initialPlans: PlansListResponse;
	initialArchivedPlans: PlansListResponse;
	initialRecentLogs: RecentLogsResponse;
	verseOfDay: VerseOfDayResponse;
}

export function LectioHome({
	initialPlans,
	initialArchivedPlans,
	initialRecentLogs,
	verseOfDay,
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

	const [composerOpen, setComposerOpen] = useState(false);

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
					<Button variant="outline" type="button" onClick={() => setComposerOpen(true)}>
						<PlusIcon className="mr-1.5 size-4" />
						{t("newPlan")}
					</Button>
					<Button type="button" onClick={() => openLogReading()} disabled={hasNoPlans}>
						<BookOpenIcon className="mr-1.5 size-4" />
						{t("logReading")}
					</Button>
				</div>
			</div>

			<PlanComposerDialog open={composerOpen} onOpenChange={setComposerOpen} />

			<VerseOfDayBanner verseOfDay={verseOfDay} />

			{hasNoPlans ? (
				<Card className="p-10 space-y-3 text-center">
					<SparklesIcon className="size-8 mx-auto text-muted-foreground" />
					<div>
						<p className="text-lg font-semibold">{t("emptyTitle")}</p>
						<p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
					</div>
					<Button type="button" onClick={() => setComposerOpen(true)}>
						<PlusIcon className="mr-1.5 size-4" />
						{t("newPlan")}
					</Button>
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
