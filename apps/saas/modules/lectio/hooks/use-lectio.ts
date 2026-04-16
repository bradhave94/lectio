"use client";

import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export type PlansListResponse = Awaited<ReturnType<typeof orpc.lectio.plans.list.call>>;
export type BuilderResponse = Awaited<ReturnType<typeof orpc.lectio.plans.builder.call>>;
export type ProgressResponse = Awaited<ReturnType<typeof orpc.lectio.plans.progress.call>>;
export type ReadingLogsResponse = Awaited<ReturnType<typeof orpc.lectio.readingLogs.list.call>>;
export type VerseOfDayResponse = Awaited<ReturnType<typeof orpc.lectio.verseOfDay.get.call>>;
export type BooksResponse = Awaited<ReturnType<typeof orpc.lectio.books.list.call>>;
export type PlanBookRow = BuilderResponse["planBooks"][number];

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

export function useLectioPlansQuery(initialData?: PlansListResponse) {
	return useQuery({
		...orpc.lectio.plans.list.queryOptions({
			input: {
				includeArchived: false,
			},
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

export function useCreatePlanMutation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.lectio.plans.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.plans.list.queryKey({
						input: {
							includeArchived: false,
						},
					}),
				});
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
				const plansQueryKey = orpc.lectio.plans.list.queryKey({
					input: {
						includeArchived: false,
					},
				});

				await queryClient.cancelQueries({ queryKey: plansQueryKey });
				const previousPlans = queryClient.getQueryData<PlansListResponse>(plansQueryKey);

				queryClient.setQueryData<PlansListResponse>(
					plansQueryKey,
					(current) => current?.filter((plan) => plan.id !== planId) ?? [],
				);

				return { previousPlans, plansQueryKey };
			},
			onError: (_error, _variables, context) => {
				if (context?.previousPlans) {
					queryClient.setQueryData(context.plansQueryKey, context.previousPlans);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.plans.list.queryKey({
						input: {
							includeArchived: false,
						},
					}),
				});
			},
		}),
	);
}

export function usePlanBuilderQuery(planId: string, initialData?: BuilderResponse) {
	return useQuery({
		...orpc.lectio.plans.builder.queryOptions({
			input: { planId },
		}),
		initialData,
	});
}

export function usePlanProgressQuery(planId: string, initialData?: ProgressResponse) {
	return useQuery({
		...orpc.lectio.plans.progress.queryOptions({
			input: { planId },
		}),
		initialData,
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
	const plansQueryKey = orpc.lectio.plans.list.queryKey({
		input: {
			includeArchived: false,
		},
	});

	return useMutation(
		orpc.lectio.plans.update.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });
				await queryClient.cancelQueries({ queryKey: plansQueryKey });

				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);
				const previousPlans = queryClient.getQueryData<PlansListResponse>(plansQueryKey);

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
						},
					})),
				);

				queryClient.setQueryData<PlansListResponse>(
					plansQueryKey,
					(current) =>
						current?.map((plan) =>
							plan.id === planId
								? {
										...plan,
										title: variables.title ?? plan.title,
										description:
											variables.description !== undefined
												? variables.description
												: plan.description,
									}
								: plan,
						) ?? [],
				);

				return {
					previousBuilder,
					previousPlans,
					builderQueryKey,
					plansQueryKey,
				};
			},
			onError: (_error, _variables, context) => {
				if (context?.previousBuilder) {
					queryClient.setQueryData(context.builderQueryKey, context.previousBuilder);
				}
				if (context?.previousPlans) {
					queryClient.setQueryData(context.plansQueryKey, context.previousPlans);
				}
				toastError(t("saveError"));
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansQueryKey });
			},
		}),
	);
}

export function useAddPlanBookMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
		input: { planId },
	});
	const plansQueryKey = orpc.lectio.plans.list.queryKey({
		input: {
			includeArchived: false,
		},
	});
	const booksQueryKey = orpc.lectio.books.list.queryKey({
		input: {},
	});

	return useMutation(
		orpc.lectio.planBooks.add.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });
				await queryClient.cancelQueries({ queryKey: booksQueryKey });

				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);
				const books = queryClient.getQueryData<BooksResponse>(booksQueryKey);

				queryClient.setQueryData<BuilderResponse>(builderQueryKey, (current) => {
					if (!current) {
						return current;
					}

					const existing = current.planBooks.find(
						(planBook) => planBook.bookId === variables.bookId,
					);

					if (existing) {
						return current;
					}

					const optimisticBook =
						books?.find((book) => book.id === variables.bookId) ??
						current.planBooks.at(0)?.book ?? {
							id: variables.bookId,
							usfmCode: "",
							name: "Book",
							testament: "OT",
							canonOrder: 999,
							chapterCount: 0,
						};

					const nextOrder = current.planBooks.length;
					const optimistic: PlanBookRow = {
						id: `optimistic-${variables.bookId}`,
						planId,
						bookId: variables.bookId,
						orderIndex: nextOrder,
						resourceUrl: null,
						resourceLabel: null,
						resourceType: null,
						notes: null,
						status: "not_started",
						startedAt: null,
						completedAt: null,
						createdAt: new Date(),
						book: optimisticBook,
						logCount: 0,
						lastLoggedAt: null,
					};

					return {
						...current,
						planBooks: sortPlanBooks([...current.planBooks, optimistic]),
						stats: {
							...current.stats,
							totalBooks: current.stats.totalBooks + 1,
							notStartedBooks: current.stats.notStartedBooks + 1,
						},
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
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansQueryKey });
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
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
		input: { planId },
	});
	const plansQueryKey = orpc.lectio.plans.list.queryKey({
		input: {
			includeArchived: false,
		},
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
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansQueryKey });
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
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
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
						planBooks: reordered,
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
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
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
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
		input: { planId },
	});
	const plansQueryKey = orpc.lectio.plans.list.queryKey({
		input: {
			includeArchived: false,
		},
	});

	return useMutation(
		orpc.lectio.planBooks.update.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: builderQueryKey });

				const previousBuilder = queryClient.getQueryData<BuilderResponse>(builderQueryKey);

				queryClient.setQueryData<BuilderResponse>(builderQueryKey, (current) => {
					if (!current) {
						return current;
					}

					const currentTarget = current.planBooks.find(
						(planBook) => planBook.id === variables.planBookId,
					);

					const nextRows = current.planBooks.map((planBook) => {
						if (planBook.id !== variables.planBookId) {
							return planBook;
						}

						return {
							...planBook,
							resourceUrl:
								variables.resourceUrl !== undefined
									? variables.resourceUrl
									: planBook.resourceUrl,
							resourceLabel:
								variables.resourceLabel !== undefined
									? variables.resourceLabel
									: planBook.resourceLabel,
							resourceType:
								variables.resourceType !== undefined
									? variables.resourceType
									: planBook.resourceType,
							notes: variables.notes !== undefined ? variables.notes : planBook.notes,
							status: variables.status ?? planBook.status,
						};
					});

					const stats = { ...current.stats };
					if (currentTarget && variables.status && variables.status !== currentTarget.status) {
						if (currentTarget.status === "completed") {
							stats.completedBooks = Math.max(0, stats.completedBooks - 1);
						} else if (currentTarget.status === "in_progress") {
							stats.inProgressBooks = Math.max(0, stats.inProgressBooks - 1);
						} else {
							stats.notStartedBooks = Math.max(0, stats.notStartedBooks - 1);
						}

						if (variables.status === "completed") {
							stats.completedBooks += 1;
						} else if (variables.status === "in_progress") {
							stats.inProgressBooks += 1;
						} else {
							stats.notStartedBooks += 1;
						}
					}

					return {
						...current,
						planBooks: nextRows,
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
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
				await queryClient.invalidateQueries({ queryKey: plansQueryKey });
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

export function useCreateReadingLogMutation(planId: string) {
	const queryClient = useQueryClient();
	const t = useTranslations("lectio.toast");
	const builderQueryKey = orpc.lectio.plans.builder.queryKey({
		input: { planId },
	});
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
		input: { planId },
	});

	return useMutation(
		orpc.lectio.readingLogs.create.mutationOptions({
			onError: () => {
				toastError(t("saveError"));
			},
			onSuccess: async (_result, variables) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.lectio.readingLogs.list.queryKey({
						input: { planId, planBookId: variables.planBookId },
					}),
				});
				await queryClient.invalidateQueries({ queryKey: builderQueryKey });
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
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
	const progressQueryKey = orpc.lectio.plans.progress.queryKey({
		input: { planId },
	});
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
					(current) =>
						current?.filter((log) => log.id !== variables.readingLogId) ?? [],
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
				await queryClient.invalidateQueries({ queryKey: progressQueryKey });
			},
		}),
	);
}

