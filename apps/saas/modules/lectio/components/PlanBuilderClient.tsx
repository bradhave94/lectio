"use client";

import { BookPickerPanel } from "@lectio/components/BookPickerPanel";
import { PlanBookDrawer } from "@lectio/components/PlanBookDrawer";
import { PlanBuilderDndList } from "@lectio/components/PlanBuilderDndList";
import { PlanStatusBadge } from "@lectio/components/PlanStatusBadge";
import {
	usePlanBuilderQuery,
	useReorderPlanBooksMutation,
	useUpdatePlanMutation,
	type BuilderResponse,
} from "@lectio/hooks/use-lectio";
import { STATUS_ORDER, type PlanBookStatus } from "@lectio/lib/constants";
import { Button, Card, Input, Progress } from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface PlanBuilderClientProps {
	planId: string;
	initialData: BuilderResponse;
}

function getCompletionPercent(completed: number, total: number) {
	if (total <= 0) {
		return 0;
	}

	return Math.round((completed / total) * 100);
}

export function PlanBuilderClient({ planId, initialData }: PlanBuilderClientProps) {
	const t = useTranslations("lectio");
	const { data } = usePlanBuilderQuery(planId, initialData);
	const updatePlanMutation = useUpdatePlanMutation(planId);
	const reorderMutation = useReorderPlanBooksMutation(planId);

	const [title, setTitle] = useState(initialData.plan.title);
	const [description, setDescription] = useState(initialData.plan.description ?? "");
	const [selectedPlanBookId, setSelectedPlanBookId] = useState<string | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const builderData = data ?? initialData;
	const completionPercent = getCompletionPercent(
		builderData.stats.completedBooks,
		builderData.stats.totalBooks,
	);

	useEffect(() => {
		setTitle(builderData.plan.title);
		setDescription(builderData.plan.description ?? "");
	}, [builderData.plan.title, builderData.plan.description]);

	const selectedPlanBook = useMemo(
		() => builderData.planBooks.find((book) => book.id === selectedPlanBookId) ?? null,
		[builderData.planBooks, selectedPlanBookId],
	);

	const statusCounts = useMemo(() => {
		return {
			not_started: builderData.stats.notStartedBooks,
			in_progress: builderData.stats.inProgressBooks,
			completed: builderData.stats.completedBooks,
		} as Record<PlanBookStatus, number>;
	}, [builderData.stats]);

	const isDirty =
		title.trim() !== builderData.plan.title ||
		(description.trim() || null) !== (builderData.plan.description ?? null);

	const handleSave = async () => {
		try {
			await updatePlanMutation.mutateAsync({
				planId,
				title: title.trim(),
				description: description.trim() ? description.trim() : null,
			});
			toastSuccess(t("toast.saved"));
		} catch {
			toastError(t("toast.saveError"));
		}
	};

	const handleReorder = async (orderedPlanBookIds: string[]) => {
		try {
			await reorderMutation.mutateAsync({
				planId,
				orderedPlanBookIds,
			});
		} catch {
			toastError(t("toast.saveError"));
		}
	};

	return (
		<>
			<div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
				<BookPickerPanel planId={planId} planBooks={builderData.planBooks} />

				<Card className="p-5 md:p-6">
					<div className="space-y-6">
						<div className="space-y-3">
							<div className="flex flex-col gap-3 md:flex-row md:items-center">
								<Input
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									maxLength={160}
									className="h-11 text-base font-semibold"
								/>
								<Button
									type="button"
									onClick={handleSave}
									disabled={!isDirty}
									loading={updatePlanMutation.isPending}
									className="shrink-0"
								>
									{t("builder.plan.save")}
								</Button>
							</div>
							<Input
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								maxLength={2000}
								placeholder={t("builder.plan.descriptionPlaceholder")}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{t("builder.progress.title")}</span>
								<span className="text-muted-foreground">
									{t("builder.progress.booksCompleted", {
										completed: builderData.stats.completedBooks,
										total: builderData.stats.totalBooks,
									})}
								</span>
							</div>
							<Progress value={completionPercent} className="h-2" />
						</div>

						<div className="grid gap-2 sm:grid-cols-3">
							{STATUS_ORDER.map((status) => (
								<div key={status} className="rounded-xl border p-3">
									<PlanStatusBadge status={status} />
									<p className="mt-2 text-xl font-semibold">{statusCounts[status]}</p>
									<p className="text-xs text-muted-foreground">{t(`status.${status}`)}</p>
								</div>
							))}
						</div>

						<div className="flex justify-end">
							<Button asChild variant="outline">
								<Link href={`/plans/${planId}/progress`}>
									{t("builder.progress.openProgressView")}
									<ArrowRightIcon className="ml-1.5 size-4" />
								</Link>
							</Button>
						</div>

						<PlanBuilderDndList
							items={builderData.planBooks}
							onReorder={handleReorder}
							onSelectItem={(planBookId) => {
								setSelectedPlanBookId(planBookId);
								setIsDrawerOpen(true);
							}}
							renderItem={(item) => (
								<div className="space-y-1">
									<div className="flex items-center justify-between gap-2">
										<p className="truncate font-medium">{item.book.name}</p>
										<PlanStatusBadge status={item.status as PlanBookStatus} />
									</div>
									{item.resourceLabel ? (
										<p className="text-xs text-muted-foreground">
											{t("builder.planList.resourcePrefix")} {item.resourceLabel}
										</p>
									) : null}
								</div>
							)}
						/>

						{builderData.planBooks.length === 0 ? (
							<p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
								{t("builder.planList.emptyDescription")}
							</p>
						) : null}
					</div>
				</Card>
			</div>

			<PlanBookDrawer
				planId={planId}
				open={isDrawerOpen}
				onOpenChange={setIsDrawerOpen}
				planBook={selectedPlanBook}
			/>
		</>
	);
}
