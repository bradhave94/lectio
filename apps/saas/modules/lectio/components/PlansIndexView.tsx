"use client";

import { NewPlanButton } from "@lectio/components/NewPlanButton";
import {
	useDeletePlanMutation,
	useLectioPlansQuery,
	useUpdatePlanMutation,
	type PlansListResponse,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import {
	ArchiveIcon,
	BookOpenIcon,
	MoreHorizontalIcon,
	NotebookTextIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

interface PlansIndexViewProps {
	initialActivePlans: PlansListResponse;
	initialAllPlans: PlansListResponse;
}

function percent(completed: number, total: number) {
	if (total <= 0) return 0;
	return Math.round((completed / total) * 100);
}

export function PlansIndexView({ initialActivePlans, initialAllPlans }: PlansIndexViewProps) {
	const t = useTranslations("lectio");
	const tToast = useTranslations("lectio.toast");
	const { confirm } = useConfirmationAlert();
	const updatePlan = useUpdatePlanMutation("");
	const deletePlan = useDeletePlanMutation();

	const activeQuery = useLectioPlansQuery(initialActivePlans, false);
	const allQuery = useLectioPlansQuery(initialAllPlans, true);

	const activePlans = activeQuery.data ?? [];
	const allPlans = allQuery.data ?? [];
	const archivedPlans = allPlans.filter((plan) => plan.archivedAt !== null);

	const handleArchive = async (planId: string) => {
		try {
			await updatePlan.mutateAsync({ planId, archived: true });
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleUnarchive = async (planId: string) => {
		try {
			await updatePlan.mutateAsync({ planId, archived: false });
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleDelete = (planId: string) => {
		confirm({
			title: t("plansIndex.delete.title"),
			message: t("plansIndex.delete.message"),
			destructive: true,
			confirmLabel: t("plansIndex.delete.confirm"),
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

	return (
		<div className="space-y-6">
			<div className="gap-3 flex flex-wrap items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">{t("plansIndex.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("plansIndex.subtitle")}</p>
				</div>
				<NewPlanButton variant="primary" />
			</div>

			<PlansTable
				plans={activePlans}
				emptyState={
					<div className="text-center space-y-3 py-10">
						<p className="font-medium">{t("plansIndex.activeEmptyTitle")}</p>
						<p className="text-sm text-muted-foreground">
							{t("plansIndex.activeEmptyHint")}
						</p>
						<NewPlanButton variant="primary" />
					</div>
				}
				onArchive={handleArchive}
				onUnarchive={handleUnarchive}
				onDelete={handleDelete}
			/>

			{archivedPlans.length > 0 ? (
				<section className="space-y-3">
					<h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
						{t("plansIndex.archivedTitle", { count: archivedPlans.length })}
					</h2>
					<PlansTable
						plans={archivedPlans}
						archived
						onArchive={handleArchive}
						onUnarchive={handleUnarchive}
						onDelete={handleDelete}
					/>
				</section>
			) : null}
		</div>
	);
}

interface PlansTableProps {
	plans: PlansListResponse;
	archived?: boolean;
	emptyState?: React.ReactNode;
	onArchive: (planId: string) => void;
	onUnarchive: (planId: string) => void;
	onDelete: (planId: string) => void;
}

function PlansTable({
	plans,
	archived = false,
	emptyState,
	onArchive,
	onUnarchive,
	onDelete,
}: PlansTableProps) {
	const t = useTranslations("lectio");
	const format = useFormatter();

	if (plans.length === 0) {
		return <Card className="p-6">{emptyState}</Card>;
	}

	return (
		<Card className="overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("plansIndex.columns.plan")}</TableHead>
						<TableHead className="hidden md:table-cell">
							{t("plansIndex.columns.progress")}
						</TableHead>
						<TableHead className="hidden lg:table-cell">
							{t("plansIndex.columns.chapters")}
						</TableHead>
						<TableHead className="hidden lg:table-cell">
							{t("plansIndex.columns.updated")}
						</TableHead>
						<TableHead className="text-right">{t("plansIndex.columns.actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{plans.map((plan) => {
						const tokens = colorTokens(plan.color);
						const Icon = iconForKey(plan.icon);
						const completion = percent(plan.completedBooks, plan.totalBooks);
						return (
							<TableRow key={plan.id} className={cn(archived && "opacity-70")}>
								<TableCell>
									<Link
										href={`/plans/${plan.id}`}
										className="group min-w-0 gap-2 flex items-center"
									>
										<span
											className={cn(
												"size-8 flex shrink-0 items-center justify-center rounded-md",
												tokens.soft,
											)}
										>
											<Icon className={cn("size-4", tokens.text)} />
										</span>
										<div className="min-w-0">
											<p className="font-medium truncate group-hover:underline">
												{plan.title}
											</p>
											{plan.description?.trim() ? (
												<p className="text-xs truncate text-muted-foreground max-w-[40ch]">
													{plan.description}
												</p>
											) : null}
										</div>
									</Link>
								</TableCell>
								<TableCell className="hidden md:table-cell w-48">
									<div className="space-y-1">
										<Progress value={completion} className="h-1.5" />
										<p className="text-xs text-muted-foreground">
											{t("plansIndex.bookProgress", {
												completed: plan.completedBooks,
												total: plan.totalBooks,
											})}
										</p>
									</div>
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<span className="text-sm text-muted-foreground">
										{plan.chaptersLogged}
									</span>
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<span className="text-sm text-muted-foreground">
										{format.dateTime(new Date(plan.updatedAt), { dateStyle: "medium" })}
									</span>
								</TableCell>
								<TableCell>
									<div className="gap-1 flex items-center justify-end">
										<Button asChild type="button" variant="ghost" size="icon" aria-label={t("plansIndex.actions.openJournal")}>
											<Link href={`/plans/${plan.id}`}>
												<NotebookTextIcon className="size-4" />
											</Link>
										</Button>
										<Button asChild type="button" variant="ghost" size="icon" aria-label={t("plansIndex.actions.edit")}>
											<Link href={`/plans/${plan.id}/edit`}>
												<PencilIcon className="size-4" />
											</Link>
										</Button>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label={t("plansIndex.actions.more")}
												>
													<MoreHorizontalIcon className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem asChild>
													<Link href={`/plans/${plan.id}`}>
														<BookOpenIcon className="mr-2 size-4" />
														{t("plansIndex.actions.openJournal")}
													</Link>
												</DropdownMenuItem>
												<DropdownMenuItem asChild>
													<Link href={`/plans/${plan.id}/edit`}>
														<PencilIcon className="mr-2 size-4" />
														{t("plansIndex.actions.edit")}
													</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												{archived ? (
													<DropdownMenuItem onClick={() => onUnarchive(plan.id)}>
														<ArchiveIcon className="mr-2 size-4" />
														{t("plansIndex.actions.unarchive")}
													</DropdownMenuItem>
												) : (
													<DropdownMenuItem onClick={() => onArchive(plan.id)}>
														<ArchiveIcon className="mr-2 size-4" />
														{t("plansIndex.actions.archive")}
													</DropdownMenuItem>
												)}
												<DropdownMenuItem
													onClick={() => onDelete(plan.id)}
													className="text-destructive"
												>
													<Trash2Icon className="mr-2 size-4" />
													{t("plansIndex.actions.delete")}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</Card>
	);
}
