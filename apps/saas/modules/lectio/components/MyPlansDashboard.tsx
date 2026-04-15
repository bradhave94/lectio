"use client";

import { NewPlanDialog } from "@lectio/components/NewPlanDialog";
import { VerseOfDayBanner } from "@lectio/components/VerseOfDayBanner";
import {
	useCreatePlanMutation,
	useDeletePlanMutation,
	useLectioPlansQuery,
	type PlansListResponse,
	type VerseOfDayResponse,
} from "@lectio/hooks/use-lectio";
import { Button, Card, Progress } from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { CalendarClockIcon, LibraryBigIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

interface MyPlansDashboardProps {
	initialPlans: PlansListResponse;
	verseOfDay: VerseOfDayResponse;
}

function percent(completed: number, total: number) {
	if (total <= 0) {
		return 0;
	}

	return Math.round((completed / total) * 100);
}

export function MyPlansDashboard({
	initialPlans,
	verseOfDay,
}: MyPlansDashboardProps) {
	const t = useTranslations("lectio");
	const format = useFormatter();
	const { confirm } = useConfirmationAlert();
	const plansQuery = useLectioPlansQuery(initialPlans);
	const createPlanMutation = useCreatePlanMutation();
	const deletePlanMutation = useDeletePlanMutation();
	const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);

	const plans = plansQuery.data ?? [];

	return (
		<div className="space-y-6">
			<VerseOfDayBanner verseOfDay={verseOfDay} />

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">{t("lectio.dashboard.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("lectio.dashboard.subtitle")}</p>
				</div>
				<Button onClick={() => setIsNewPlanOpen(true)}>
					<PlusIcon className="mr-1.5 size-4" />
					{t("lectio.dashboard.newPlan")}
				</Button>
			</div>

			<NewPlanDialog
				open={isNewPlanOpen}
				onOpenChange={setIsNewPlanOpen}
				isSubmitting={createPlanMutation.isPending}
				onSubmit={async (payload) => {
					try {
						await createPlanMutation.mutateAsync(payload);
						toastSuccess(t("lectio.toast.saved"));
						setIsNewPlanOpen(false);
					} catch {
						toastError(t("lectio.toast.saveError"));
					}
				}}
			/>

			{plansQuery.isPending ? (
				<div className="space-y-3">
					<div className="h-24 animate-pulse rounded-3xl bg-muted" />
					<div className="h-24 animate-pulse rounded-3xl bg-muted" />
				</div>
			) : plans.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-lg font-semibold">{t("lectio.dashboard.emptyTitle")}</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{t("lectio.dashboard.emptyDescription")}
					</p>
					<div className="mt-4">
						<Button type="button" onClick={() => setIsNewPlanOpen(true)}>
							<PlusIcon className="mr-1.5 size-4" />
							{t("lectio.dashboard.newPlan")}
						</Button>
					</div>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{plans.map((plan) => {
						const completion = percent(plan.completedBooks, plan.totalBooks);
						return (
							<Card key={plan.id} className="p-5">
								<div className="flex h-full flex-col justify-between gap-4">
									<div>
										<h2 className="text-xl font-semibold">{plan.title}</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											{plan.description || t("lectio.dashboard.noDescription")}
										</p>

										<div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
											<p className="inline-flex items-center gap-1">
												<LibraryBigIcon className="size-3.5" />
												{t("lectio.dashboard.card.booksProgress", {
													completed: plan.completedBooks,
													total: plan.totalBooks,
												})}
											</p>
											<p className="inline-flex items-center justify-end gap-1">
												<CalendarClockIcon className="size-3.5" />
												{t("lectio.dashboard.card.updatedAt", {
													date: format.dateTime(new Date(plan.updatedAt), {
														dateStyle: "medium",
													}),
												})}
											</p>
										</div>

										<div className="mt-3">
											<Progress value={completion} className="h-2" />
										</div>
									</div>

									<div className="flex items-center justify-between gap-2">
										<div className="flex gap-2">
											<Button asChild size="sm">
												<Link href={`/plans/${plan.id}`}>
													{t("lectio.dashboard.card.openPlan")}
												</Link>
											</Button>
											<Button asChild size="sm" variant="outline">
												<Link href={`/plans/${plan.id}/progress`}>
													{t("lectio.dashboard.card.viewProgress")}
												</Link>
											</Button>
										</div>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											disabled={deletePlanMutation.isPending}
											onClick={() =>
												confirm({
													title: t("lectio.dashboard.delete.title"),
													message: t("lectio.dashboard.delete.message"),
													confirmLabel: t("lectio.dashboard.delete.confirm"),
													destructive: true,
													onConfirm: async () => {
														try {
															await deletePlanMutation.mutateAsync({
																planId: plan.id,
															});
															toastSuccess(t("lectio.toast.saved"));
														} catch {
															toastError(t("lectio.toast.saveError"));
														}
													},
												})
											}
										>
											<Trash2Icon className="size-4 text-destructive" />
										</Button>
									</div>
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
