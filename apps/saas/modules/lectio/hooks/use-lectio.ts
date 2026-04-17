"use client";

import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export type PlansListResponse = Awaited<ReturnType<typeof orpc.lectio.plans.list.call>>;
export type BuilderResponse = Awaited<ReturnType<typeof orpc.lectio.plans.builder.call>>;
export type ReadingLogsResponse = Awaited<ReturnType<typeof orpc.lectio.readingLogs.list.call>>;
export type RecentLogsResponse = Awaited<ReturnType<typeof orpc.lectio.readingLogs.recent.call>>;
export type PlanRecentLogsResponse = Awaited<ReturnType<typeof orpc.lectio.plans.recentLogs.call>>;
export type VerseOfDayResponse = Awaited<ReturnType<typeof orpc.lectio.verseOfDay.get.call>>;
export type BooksResponse = Awaited<ReturnType<typeof orpc.lectio.books.list.call>>;
export type PlanBookRow = BuilderResponse["planBooks"][number];

const DEFAULT_PLANS_LIST_INPUT = { includeArchived: false } as const;
const DEFAULT_PLANS_LIST_INPUT_INCLUDE = { includeArchived: true } as const;

function plansListKey(includeArchived: boolean) {
	return orpc.lectio.plans.list.queryKey({
		input: includeArchived ? DEFAULT_PLANS_LIST_INPUT_INCLUDE : DEFAULT_PLANS_LIST_INPUT,
	});
}

function updateBuilderCache(
	current: BuilderResponse | undefined,
	updater: (draft: BuilderResponse) => BuilderResponse,
) {
	if (!current) {
		return current;
	}

	return updater(current);
}

function sortPlanBooks(rows: PlanBookRow[]) {
	return rows
		.slice()
		.sort((left, right) =>
			left.orderIndex === right.orderIndex
				? new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
				: left.orderIndex - right.orderIndex,
		);
}

export function useLectioPlansQuery(initialData?: PlansListResponse, includeArchived = false) {
	return useQuery({
		...orpc.lectio.plans.list.queryOptions({
			input: includeArchived ? DEFAULT_PLANS_LIST_INPUT_INCLUDE : DEFAULT_PLANS_LIST_INPUT,
		}),
		initialData,
	});
}

export function useLectioVerseOfDayQuery(initialData?: VerseOfDayResponse) {
	return useQuery({
		...orpc.lectio.verseOfDay.get.queryOptions({
			input: {},
		}),
		initialData,
	});
}

export function useUserRecentReadingLogsQuery(initialData?: RecentLogsResponse, limit = 50) {
	return useQuery({
		...orpc.lectio.readingLogs.recent.queryOptions({
			input: { limit },
		}),
		initialData,
	});
}

export function usePlanRecentReadingLogsQuery(
	planId: string,
	initialData?: PlanRecentLogsResponse,
	limit = 50,
) {
	return useQuery({
		...orpc.lectio.plans.recentLogs.queryOptions({
			input: { planId, limit },
		}),
		initialData,
	});
}

export function useCreatePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.lectio.plans.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
				await queryClient.invalidateQueries({ queryKey: plansListKey(true) });
			},
		}),
	);
}

export function useDeletePlanMutation() {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");

	return useMutation(
		orpc.lectio.plans.delete.mutationOptions({
			onMutate: async ({ planId }) => {
				const queryKey = plansListKey(false);
				await queryClient.cancelQueries({ queryKey });
				const previousPlans = queryClient.getQueryData<PlansListResponse>(queryKey);

				queryClient.setQueryData<PlansListResponse>(
					queryKey,
					(current) => current?.filter((plan) => plan.id !== planId) ?? [],
				);

				return { previousPlans, queryKey };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousPlans) {
					queryClient.setQueryData(context.queryKey, context.previousPlans);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
				await queryClient.invalidateQueries({ queryKey: plansListKey(true) });
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.readingLogs.recent.queryKey({ input: { limit: 50 } }),
				});
			},
		}),
	);
}

export function usePlanBuilderQuery(
	planId: string,
	initialData?: BuilderResponse,
	options?: { enabled?: boolean },
) {
	return useQuery({
		...orpc.lectio.plans.builder.queryOptions({
			input: { planId },
		}),
		initialData,
		...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
	});
}

export function useBooksQuery(filters: {
	testament?: "OT" | "NT";
	search?: string;
	initialData?: BooksResponse;
}) {
	return useQuery({
		...orpc.lectio.books.list.queryOptions({
			input: {
				testament: filters.testament,
				search: filters.search?.trim() || undefined,
			},
		}),
		initialData: filters.initialData,
	});
}

export function useBookChaptersQuery(bookId: number | null) {
	return useQuery({
		...orpc.lectio.books.chapters.queryOptions({
			input: {
				bookId: bookId ?? 0,
			},
		}),
		enabled: bookId !== null,
	});
}

export function useUpdatePlanMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.plans.update.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });
				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);

				queryClient.setQueryData<BuilderResponse>(builderQueryKey, (current) =>
					updateBuilderCache(current, (draft) => ({
						...draft,
						plan: {
							...draft.plan,
							title: variables.title ?? draft.plan.title,
							description:
								variables.description !== undefined
									? variables.description
									: draft.plan.description,
							color: variables.color !== undefined ? variables.color : draft.plan.color,
							icon: variables.icon !== undefined ? variables.icon : draft.plan.icon,
							startDate:
								variables.startDate !== undefined ? variables.startDate : draft.plan.startDate,
							targetEndDate:
								variables.targetEndDate !== undefined
									? variables.targetEndDate
									: draft.plan.targetEndDate,
							cadence: variables.cadence !== undefined ? variables.cadence : draft.plan.cadence,
							archivedAt:
								variables.archived === undefined
									? draft.plan.archivedAt
									: variables.archived
										? (draft.plan.archivedAt ?? new Date())
										: null,
						},
					})),
				);

				return { previousBuilder };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousBuilder) {
					queryClient.setQueryData(builderQueryKey, context.previousBuilder);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
				await queryClient.invalidateQueries({ queryKey: plansListKey(true) });
			},
		}),
	);
}

export function useAddPlanBooksMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.planBooks.addMany.mutationOptions({
			onError: () => {
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
			},
		}),
	);
}

export function useRemovePlanBookMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.planBooks.remove.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });
				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);

				queryClient.setQueryData<BuilderResponse>(builderQueryKey, (current) => {
					if (!current) {
						return current;
					}

					const target = current.planBooks.find((item) => item.id === variables.planBookId);
					if (!target) {
						return current;
					}

					const remaining = current.planBooks
						.filter((item) => item.id !== variables.planBookId)
						.map((item, index) => ({
							...item,
							orderIndex: index,
						}));

					const stats = { ...current.stats };
					stats.totalBooks = Math.max(0, stats.totalBooks - 1);
					if (target.status === "completed") {
						stats.completedBooks = Math.max(0, stats.completedBooks - 1);
					} else if (target.status === "in_progress") {
						stats.inProgressBooks = Math.max(0, stats.inProgressBooks - 1);
					} else {
						stats.notStartedBooks = Math.max(0, stats.notStartedBooks - 1);
					}

					stats.totalLogs = Math.max(0, stats.totalLogs - target.logCount);
					stats.chaptersInScope = Math.max(0, stats.chaptersInScope - target.chaptersInScope);
					stats.chaptersCovered = Math.max(0, stats.chaptersCovered - target.chaptersCovered);

					return {
						...current,
						planBooks: remaining,
						stats,
					};
				});

				return { previousBuilder };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousBuilder) {
					queryClient.setQueryData(builderQueryKey, context.previousBuilder);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
			},
		}),
	);
}

export function useReorderPlanBooksMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.planBooks.reorder.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });
				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);

				queryClient.setQueryData<BuilderResponse>(builderQueryKey, (current) => {
					if (!current) {
						return current;
					}

					const byId = new Map(current.planBooks.map((row) => [row.id, row]));
					const reordered = variables.orderedPlanBookIds
						.map((id, index) => {
							const row = byId.get(id);
							if (!row) {
								return null;
							}
							return {
								...row,
								orderIndex: index,
							};
						})
						.filter((row): row is PlanBookRow => row !== null);

					return {
						...current,
						planBooks: sortPlanBooks(reordered),
					};
				});

				return { previousBuilder };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousBuilder) {
					queryClient.setQueryData(builderQueryKey, context.previousBuilder);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
			},
		}),
	);
}

export function useUpdatePlanBookMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.planBooks.update.mutationOptions({
			onError: () => {
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
			},
		}),
	);
}

export function useReadingLogsQuery(
	planId: string,
	planBookId: string,
	initialData?: ReadingLogsResponse,
) {
	return useQuery({
		...orpc.lectio.readingLogs.list.queryOptions({
			input: {
				planId,
				planBookId,
			},
		}),
		enabled: Boolean(planBookId),
		initialData,
	});
}

export function useLogReadingMutation() {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");

	return useMutation(
		orpc.lectio.readingLogs.log.mutationOptions({
			onError: () => {
				toastError(t("saveError"));
			},
			onSuccess: async (_result, variables) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.lectio.plans.builder.queryKey({
							input: { planId: variables.planId },
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.lectio.plans.recentLogs.queryKey({
							input: { planId: variables.planId, limit: 50 },
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.lectio.readingLogs.recent.queryKey({ input: { limit: 50 } }),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.lectio.readingLogs.list.queryKey({
							input: { planId: variables.planId, planBookId: variables.planBookId },
						}),
					}),
					queryClient.invalidateQueries({ queryKey: plansListKey(false) }),
					queryClient.invalidateQueries({ queryKey: plansListKey(true) }),
				]);
			},
		}),
	);
}

export function useUpdateReadingLogMutation() {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const userRecentKey = orpc.lectio.readingLogs.recent.queryKey({ input: { limit: 50 } });
	const userRecentLargeKey = orpc.lectio.readingLogs.recent.queryKey({ input: { limit: 200 } });

	return useMutation(
		orpc.lectio.readingLogs.update.mutationOptions({
			onError: () => {
				toastError(t("saveError"));
			},
			onSettled: async () => {
				// We don't know which plan / plan-book the entry belongs to here,
				// so do a coarse invalidation across the cross-plan feed and the
				// plan list (which surfaces chapter counts). The plan-scoped
				// builders + per-plan-book log lists are refetched lazily when the
				// user opens those views.
				await queryClient.invalidateQueries({ queryKey: userRecentKey });
				await queryClient.invalidateQueries({ queryKey: userRecentLargeKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
				await queryClient.invalidateQueries({ queryKey: plansListKey(true) });
				// Builder + per-plan recent feeds: invalidate everything under those
				// roots so any open journal page picks up the change.
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.plans.builder.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.plans.recentLogs.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.readingLogs.list.key(),
				});
			},
		}),
	);
}

export function useDeleteReadingLogMutation(planId: string, planBookId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});
	const recentQueryKey = orpc.lectio.plans.recentLogs.queryKey({
		input: { planId, limit: 50 },
	});
	const userRecentKey = orpc.lectio.readingLogs.recent.queryKey({ input: { limit: 50 } });
	const logsQueryKey = orpc.lectio.readingLogs.list.queryKey({
		input: { planId, planBookId },
	});

	return useMutation(
		orpc.lectio.readingLogs.delete.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: logsQueryKey });
				const previousLogs = queryClient.getQueryData<ReadingLogsResponse>(logsQueryKey);

				queryClient.setQueryData<ReadingLogsResponse>(
					logsQueryKey,
					(current) => current?.filter((log) => log.id !== variables.readingLogId) ?? [],
				);

				return { previousLogs };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousLogs) {
					queryClient.setQueryData(logsQueryKey, context.previousLogs);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: logsQueryKey });
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: recentQueryKey });
				await queryClient.invalidateQueries({ queryKey: userRecentKey });
				await queryClient.invalidateQueries({ queryKey: plansListKey(false) });
			},
		}),
	);
}
