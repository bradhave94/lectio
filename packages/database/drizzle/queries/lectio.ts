import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import { bookChapters, books, planBooks, plans, readingLogs } from "../schema/postgres";

export interface BooksListFilters {
	testament?: "OT" | "NT";
	search?: string;
}

export interface PlanCardSummary {
	id: string;
	title: string;
	description: string | null;
	updatedAt: Date;
	createdAt: Date;
	totalBooks: number;
	completedBooks: number;
}

export interface PlanBuilderData {
	plan: {
		id: string;
		title: string;
		description: string | null;
		updatedAt: Date;
		createdAt: Date;
	};
	planBooks: Array<{
		id: string;
		planId: string;
		bookId: number;
		orderIndex: number;
		resourceUrl: string | null;
		resourceLabel: string | null;
		resourceType: string | null;
		notes: string | null;
		status: string;
		startedAt: Date | null;
		completedAt: Date | null;
		createdAt: Date;
		book: {
			id: number;
			usfmCode: string;
			name: string;
			testament: string;
			canonOrder: number;
			chapterCount: number;
		};
		logCount: number;
		lastLoggedAt: string | null;
	}>;
	stats: {
		totalBooks: number;
		completedBooks: number;
		inProgressBooks: number;
		notStartedBooks: number;
		totalLogs: number;
		totalChaptersLogged: number;
	};
}

export interface PlanProgressData {
	plan: {
		id: string;
		title: string;
		description: string | null;
		updatedAt: Date;
		createdAt: Date;
	};
	stats: {
		totalBooks: number;
		completedBooks: number;
		inProgressBooks: number;
		notStartedBooks: number;
		totalLogs: number;
		totalChaptersLogged: number;
	};
	books: Array<{
		id: string;
		orderIndex: number;
		status: string;
		resourceUrl: string | null;
		resourceLabel: string | null;
		resourceType: string | null;
		startedAt: Date | null;
		completedAt: Date | null;
		book: {
			id: number;
			name: string;
			usfmCode: string;
			chapterCount: number;
		};
		logCount: number;
		mostRecentLog: {
			id: string;
			chapterStart: number;
			chapterEnd: number;
			verseStart: number | null;
			verseEnd: number | null;
			note: string | null;
			loggedAt: string;
		} | null;
	}>;
}

export async function listBooks(filters: BooksListFilters = {}) {
	const clauses = [];

	if (filters.testament) {
		clauses.push(eq(books.testament, filters.testament));
	}

	const normalizedSearch = filters.search?.trim();
	if (normalizedSearch) {
		clauses.push(ilike(books.name, `%${normalizedSearch}%`));
	}

	const where = clauses.length > 0 ? and(...clauses) : undefined;

	return db.query.books.findMany({
		where,
		orderBy: [asc(books.canonOrder)],
	});
}

export async function listBookChapters(bookId: number) {
	return db.query.bookChapters.findMany({
		where: eq(bookChapters.bookId, bookId),
		orderBy: [asc(bookChapters.chapterNum)],
	});
}

export async function getBookById(bookId: number) {
	return db.query.books.findFirst({
		where: eq(books.id, bookId),
	});
}

export async function getBookChapter(bookId: number, chapterNum: number) {
	return db.query.bookChapters.findFirst({
		where: and(eq(bookChapters.bookId, bookId), eq(bookChapters.chapterNum, chapterNum)),
	});
}

export async function createPlan(input: {
	userId: string;
	title: string;
	description?: string | null;
}) {
	const [created] = await db
		.insert(plans)
		.values({
			userId: input.userId,
			title: input.title,
			description: input.description ?? null,
		})
		.returning();

	return created;
}

export async function getPlanById(planId: string) {
	return db.query.plans.findFirst({
		where: eq(plans.id, planId),
	});
}

export async function getUserPlanById(planId: string, userId: string) {
	return db.query.plans.findFirst({
		where: and(eq(plans.id, planId), eq(plans.userId, userId)),
	});
}

export async function listUserPlansWithSummary(userId: string): Promise<PlanCardSummary[]> {
	const rows = await db
		.select({
			id: plans.id,
			title: plans.title,
			description: plans.description,
			updatedAt: plans.updatedAt,
			createdAt: plans.createdAt,
			totalBooks: sql<number>`COALESCE(COUNT(${planBooks.id}), 0)`,
			completedBooks: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${planBooks.status} = 'completed'), 0)`,
		})
		.from(plans)
		.leftJoin(planBooks, eq(planBooks.planId, plans.id))
		.where(eq(plans.userId, userId))
		.groupBy(plans.id)
		.orderBy(desc(plans.updatedAt));

	return rows.map((row) => ({
		...row,
		totalBooks: Number(row.totalBooks),
		completedBooks: Number(row.completedBooks),
	}));
}

export async function updatePlan(
	planId: string,
	userId: string,
	changes: {
		title?: string;
		description?: string | null;
	},
) {
	const [updated] = await db
		.update(plans)
		.set({
			...(changes.title !== undefined ? { title: changes.title } : {}),
			...(changes.description !== undefined ? { description: changes.description } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
		.returning();

	return updated ?? null;
}

export async function deletePlan(planId: string, userId: string) {
	const [deleted] = await db
		.delete(plans)
		.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
		.returning({ id: plans.id });

	return deleted ?? null;
}

export async function listPlanBooks(planId: string) {
	return db.query.planBooks.findMany({
		where: eq(planBooks.planId, planId),
		orderBy: [asc(planBooks.orderIndex), asc(planBooks.createdAt)],
		with: {
			book: true,
		},
	});
}

export async function getPlanBookById(planBookId: string) {
	return db.query.planBooks.findFirst({
		where: eq(planBooks.id, planBookId),
		with: {
			book: true,
			plan: true,
		},
	});
}

export async function getPlanBookByPlanAndBook(planId: string, bookId: number) {
	return db.query.planBooks.findFirst({
		where: and(eq(planBooks.planId, planId), eq(planBooks.bookId, bookId)),
	});
}

export async function getNextPlanBookOrder(planId: string) {
	const [row] = await db
		.select({
			nextOrder: sql<number>`COALESCE(MAX(${planBooks.orderIndex}) + 1, 0)`,
		})
		.from(planBooks)
		.where(eq(planBooks.planId, planId));

	return Number(row?.nextOrder ?? 0);
}

export async function addBookToPlan(input: {
	planId: string;
	bookId: number;
	orderIndex: number;
}) {
	const [created] = await db
		.insert(planBooks)
		.values({
			planId: input.planId,
			bookId: input.bookId,
			orderIndex: input.orderIndex,
		})
		.returning();

	return created;
}

export async function updatePlanBook(
	planBookId: string,
	changes: {
		orderIndex?: number;
		resourceUrl?: string | null;
		resourceLabel?: string | null;
		resourceType?:
			| "reading_plan"
			| "video"
			| "podcast"
			| "book"
			| "article"
			| "other"
			| null;
		notes?: string | null;
		status?: "not_started" | "in_progress" | "completed";
		startedAt?: Date | null;
		completedAt?: Date | null;
	},
) {
	const [updated] = await db
		.update(planBooks)
		.set(changes)
		.where(eq(planBooks.id, planBookId))
		.returning();

	return updated ?? null;
}

export async function removePlanBook(planBookId: string) {
	const [deleted] = await db
		.delete(planBooks)
		.where(eq(planBooks.id, planBookId))
		.returning();

	return deleted ?? null;
}

export async function reorderPlanBooks(
	planId: string,
	orderedPlanBookIds: string[],
) {
	if (orderedPlanBookIds.length === 0) {
		return;
	}

	await db.transaction(async (tx) => {
		for (let index = 0; index < orderedPlanBookIds.length; index += 1) {
			const planBookId = orderedPlanBookIds[index];
			await tx
				.update(planBooks)
				.set({ orderIndex: index })
				.where(and(eq(planBooks.id, planBookId), eq(planBooks.planId, planId)));
		}
	});
}

export async function listReadingLogsByPlanBook(planBookId: string) {
	return db.query.readingLogs.findMany({
		where: eq(readingLogs.planBookId, planBookId),
		orderBy: [desc(readingLogs.loggedAt), desc(readingLogs.createdAt)],
	});
}

export async function createReadingLog(input: {
	planBookId: string;
	chapterStart: number;
	chapterEnd: number;
	verseStart?: number | null;
	verseEnd?: number | null;
	note?: string | null;
	loggedAt?: string;
}) {
	const [created] = await db
		.insert(readingLogs)
		.values({
			planBookId: input.planBookId,
			chapterStart: input.chapterStart,
			chapterEnd: input.chapterEnd,
			verseStart: input.verseStart ?? null,
			verseEnd: input.verseEnd ?? null,
			note: input.note ?? null,
			loggedAt: input.loggedAt,
		})
		.returning();

	return created;
}

export async function getReadingLogById(logId: string) {
	return db.query.readingLogs.findFirst({
		where: eq(readingLogs.id, logId),
		with: {
			planBook: {
				with: {
					plan: true,
					book: true,
				},
			},
		},
	});
}

export async function deleteReadingLog(logId: string) {
	const [deleted] = await db
		.delete(readingLogs)
		.where(eq(readingLogs.id, logId))
		.returning();

	return deleted ?? null;
}

function toProgressStats(input: {
	totalBooks: number;
	completedBooks: number;
	inProgressBooks: number;
	notStartedBooks: number;
	totalLogs: number;
	totalChaptersLogged: number;
}) {
	return {
		totalBooks: Number(input.totalBooks),
		completedBooks: Number(input.completedBooks),
		inProgressBooks: Number(input.inProgressBooks),
		notStartedBooks: Number(input.notStartedBooks),
		totalLogs: Number(input.totalLogs),
		totalChaptersLogged: Number(input.totalChaptersLogged),
	};
}

export async function getPlanProgressStats(planId: string) {
	const [stats] = await db
		.select({
			totalBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}), 0)`,
			completedBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}) FILTER (WHERE ${planBooks.status} = 'completed'), 0)`,
			inProgressBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}) FILTER (WHERE ${planBooks.status} = 'in_progress'), 0)`,
			notStartedBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}) FILTER (WHERE ${planBooks.status} = 'not_started'), 0)`,
			totalLogs: sql<number>`COALESCE(COUNT(${readingLogs.id}), 0)`,
			totalChaptersLogged: sql<number>`COALESCE(SUM(${readingLogs.chapterEnd} - ${readingLogs.chapterStart} + 1), 0)`,
		})
		.from(planBooks)
		.leftJoin(readingLogs, eq(readingLogs.planBookId, planBooks.id))
		.where(eq(planBooks.planId, planId));

	return toProgressStats({
		totalBooks: Number(stats?.totalBooks ?? 0),
		completedBooks: Number(stats?.completedBooks ?? 0),
		inProgressBooks: Number(stats?.inProgressBooks ?? 0),
		notStartedBooks: Number(stats?.notStartedBooks ?? 0),
		totalLogs: Number(stats?.totalLogs ?? 0),
		totalChaptersLogged: Number(stats?.totalChaptersLogged ?? 0),
	});
}

export async function getPlanBuilderData(planId: string): Promise<PlanBuilderData | null> {
	const plan = await getPlanById(planId);
	if (!plan) {
		return null;
	}

	const rows = await db
		.select({
			id: planBooks.id,
			planId: planBooks.planId,
			bookId: planBooks.bookId,
			orderIndex: planBooks.orderIndex,
			resourceUrl: planBooks.resourceUrl,
			resourceLabel: planBooks.resourceLabel,
			resourceType: planBooks.resourceType,
			notes: planBooks.notes,
			status: planBooks.status,
			startedAt: planBooks.startedAt,
			completedAt: planBooks.completedAt,
			createdAt: planBooks.createdAt,
			book: {
				id: books.id,
				usfmCode: books.usfmCode,
				name: books.name,
				testament: books.testament,
				canonOrder: books.canonOrder,
				chapterCount: books.chapterCount,
			},
			logCount: sql<number>`COALESCE(COUNT(${readingLogs.id}), 0)`,
			lastLoggedAt: sql<string | null>`MAX(${readingLogs.loggedAt})`,
		})
		.from(planBooks)
		.innerJoin(books, eq(books.id, planBooks.bookId))
		.leftJoin(readingLogs, eq(readingLogs.planBookId, planBooks.id))
		.where(eq(planBooks.planId, planId))
		.groupBy(planBooks.id, books.id)
		.orderBy(asc(planBooks.orderIndex), asc(planBooks.createdAt));

	const stats = await getPlanProgressStats(planId);

	return {
		plan: {
			id: plan.id,
			title: plan.title,
			description: plan.description,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		},
		planBooks: rows.map((row) => ({
			...row,
			logCount: Number(row.logCount),
		})),
		stats,
	};
}

export async function getPlanProgressData(planId: string): Promise<PlanProgressData | null> {
	const plan = await getPlanById(planId);
	if (!plan) {
		return null;
	}

	const stats = await getPlanProgressStats(planId);

	const planBookRows = await db.query.planBooks.findMany({
		where: eq(planBooks.planId, planId),
		orderBy: [asc(planBooks.orderIndex), asc(planBooks.createdAt)],
		with: {
			book: true,
			readingLogs: {
				orderBy: [desc(readingLogs.loggedAt), desc(readingLogs.createdAt)],
			},
		},
	});

	const booksData = planBookRows.map((row) => ({
		id: row.id,
		orderIndex: row.orderIndex,
		status: row.status,
		resourceUrl: row.resourceUrl,
		resourceLabel: row.resourceLabel,
		resourceType: row.resourceType,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		book: {
			id: row.book.id,
			name: row.book.name,
			usfmCode: row.book.usfmCode,
			chapterCount: row.book.chapterCount,
		},
		logCount: row.readingLogs.length,
		mostRecentLog:
			row.readingLogs.length > 0
				? {
						id: row.readingLogs[0].id,
						chapterStart: row.readingLogs[0].chapterStart,
						chapterEnd: row.readingLogs[0].chapterEnd,
						verseStart: row.readingLogs[0].verseStart,
						verseEnd: row.readingLogs[0].verseEnd,
						note: row.readingLogs[0].note,
						loggedAt: row.readingLogs[0].loggedAt,
					}
				: null,
	}));

	return {
		plan: {
			id: plan.id,
			title: plan.title,
			description: plan.description,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		},
		stats,
		books: booksData,
	};
}

export async function listPlanBookIdsInOrder(planId: string) {
	const rows = await db
		.select({ id: planBooks.id })
		.from(planBooks)
		.where(eq(planBooks.planId, planId))
		.orderBy(asc(planBooks.orderIndex), asc(planBooks.createdAt));

	return rows.map((row) => row.id);
}

export async function normalizePlanBookOrder(planId: string) {
	const orderedIds = await listPlanBookIdsInOrder(planId);
	await reorderPlanBooks(planId, orderedIds);
}

export async function listPlanBooksByIds(planBookIds: string[]) {
	if (planBookIds.length === 0) {
		return [];
	}

	return db.query.planBooks.findMany({
		where: inArray(planBooks.id, planBookIds),
		with: {
			book: true,
			plan: true,
		},
	});
}

export async function getPlanBooksCount(planId: string) {
	const [row] = await db
		.select({ count: count(planBooks.id) })
		.from(planBooks)
		.where(eq(planBooks.planId, planId));

	return Number(row?.count ?? 0);
}
