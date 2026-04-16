import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

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
	color: string | null;
	icon: string | null;
	startDate: string | null;
	targetEndDate: string | null;
	cadence: string | null;
	archivedAt: Date | null;
	updatedAt: Date;
	createdAt: Date;
	totalBooks: number;
	completedBooks: number;
	chaptersLogged: number;
}

export interface PlanBuilderBook {
	id: string;
	planId: string;
	bookId: number;
	orderIndex: number;
	chapterStart: number | null;
	chapterEnd: number | null;
	notes: string | null;
	status: string;
	statusManual: boolean;
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
	chaptersInScope: number;
	chaptersCovered: number;
}

export interface PlanAggregateStats {
	totalBooks: number;
	completedBooks: number;
	inProgressBooks: number;
	notStartedBooks: number;
	totalLogs: number;
	totalChaptersLogged: number;
	chaptersInScope: number;
	chaptersCovered: number;
}

export interface PlanDetail {
	id: string;
	userId: string;
	title: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	startDate: string | null;
	targetEndDate: string | null;
	cadence: string | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PlanBuilderData {
	plan: PlanDetail;
	planBooks: PlanBuilderBook[];
	stats: PlanAggregateStats;
}

export interface RecentLogEntry {
	id: string;
	planId: string;
	planTitle: string;
	planColor: string | null;
	planIcon: string | null;
	planBookId: string;
	bookName: string;
	bookUsfmCode: string;
	chapterStart: number;
	chapterEnd: number;
	verseStart: number | null;
	verseEnd: number | null;
	note: string | null;
	loggedAt: string;
	createdAt: Date;
	submissionId: string | null;
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
	color?: string | null;
	icon?: string | null;
	startDate?: string | null;
	targetEndDate?: string | null;
	cadence?: string | null;
}) {
	const [created] = await db
		.insert(plans)
		.values({
			userId: input.userId,
			title: input.title,
			description: input.description ?? null,
			color: input.color ?? null,
			icon: input.icon ?? null,
			startDate: input.startDate ?? null,
			targetEndDate: input.targetEndDate ?? null,
			cadence: input.cadence ?? null,
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

export async function listUserPlansWithSummary(
	userId: string,
	options: { includeArchived?: boolean } = {},
): Promise<PlanCardSummary[]> {
	const archivedClause = options.includeArchived ? undefined : isNull(plans.archivedAt);

	const whereClause = archivedClause
		? and(eq(plans.userId, userId), archivedClause)
		: eq(plans.userId, userId);

	const rows = await db
		.select({
			id: plans.id,
			title: plans.title,
			description: plans.description,
			color: plans.color,
			icon: plans.icon,
			startDate: plans.startDate,
			targetEndDate: plans.targetEndDate,
			cadence: plans.cadence,
			archivedAt: plans.archivedAt,
			updatedAt: plans.updatedAt,
			createdAt: plans.createdAt,
			totalBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}), 0)`,
			completedBooks: sql<number>`COALESCE(COUNT(DISTINCT ${planBooks.id}) FILTER (WHERE ${planBooks.status} = 'completed'), 0)`,
			chaptersLogged: sql<number>`COALESCE(COUNT(DISTINCT (${readingLogs.planBookId}::text || ':' || ${readingLogs.chapterStart}::text)), 0)`,
		})
		.from(plans)
		.leftJoin(planBooks, eq(planBooks.planId, plans.id))
		.leftJoin(readingLogs, eq(readingLogs.planBookId, planBooks.id))
		.where(whereClause)
		.groupBy(plans.id)
		.orderBy(desc(plans.updatedAt));

	return rows.map((row) => ({
		...row,
		totalBooks: Number(row.totalBooks),
		completedBooks: Number(row.completedBooks),
		chaptersLogged: Number(row.chaptersLogged),
	}));
}

export interface UpdatePlanChanges {
	title?: string;
	description?: string | null;
	color?: string | null;
	icon?: string | null;
	startDate?: string | null;
	targetEndDate?: string | null;
	cadence?: string | null;
	archivedAt?: Date | null;
}

export async function updatePlan(
	planId: string,
	userId: string,
	changes: UpdatePlanChanges,
) {
	const patch: Record<string, unknown> = { updatedAt: new Date() };
	if (changes.title !== undefined) patch.title = changes.title;
	if (changes.description !== undefined) patch.description = changes.description;
	if (changes.color !== undefined) patch.color = changes.color;
	if (changes.icon !== undefined) patch.icon = changes.icon;
	if (changes.startDate !== undefined) patch.startDate = changes.startDate;
	if (changes.targetEndDate !== undefined) patch.targetEndDate = changes.targetEndDate;
	if (changes.cadence !== undefined) patch.cadence = changes.cadence;
	if (changes.archivedAt !== undefined) patch.archivedAt = changes.archivedAt;

	const [updated] = await db
		.update(plans)
		.set(patch)
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
	chapterStart?: number | null;
	chapterEnd?: number | null;
}) {
	const [created] = await db
		.insert(planBooks)
		.values({
			planId: input.planId,
			bookId: input.bookId,
			orderIndex: input.orderIndex,
			chapterStart: input.chapterStart ?? null,
			chapterEnd: input.chapterEnd ?? null,
		})
		.returning();

	return created;
}

export interface AddBooksToPlanInput {
	planId: string;
	books: Array<{
		bookId: number;
		chapterStart?: number | null;
		chapterEnd?: number | null;
	}>;
}

export async function addBooksToPlan({ planId, books: booksToAdd }: AddBooksToPlanInput) {
	if (booksToAdd.length === 0) {
		return [];
	}

	return db.transaction(async (tx) => {
		const [orderRow] = await tx
			.select({
				nextOrder: sql<number>`COALESCE(MAX(${planBooks.orderIndex}) + 1, 0)`,
			})
			.from(planBooks)
			.where(eq(planBooks.planId, planId));

		const startingIndex = Number(orderRow?.nextOrder ?? 0);

		const existingRows = await tx
			.select({ bookId: planBooks.bookId })
			.from(planBooks)
			.where(
				and(
					eq(planBooks.planId, planId),
					inArray(
						planBooks.bookId,
						booksToAdd.map((book) => book.bookId),
					),
				),
			);

		const existingIds = new Set(existingRows.map((row) => row.bookId));
		const toInsert = booksToAdd
			.filter((book) => !existingIds.has(book.bookId))
			.map((book, index) => ({
				planId,
				bookId: book.bookId,
				orderIndex: startingIndex + index,
				chapterStart: book.chapterStart ?? null,
				chapterEnd: book.chapterEnd ?? null,
			}));

		if (toInsert.length === 0) {
			return [];
		}

		return tx.insert(planBooks).values(toInsert).returning();
	});
}

export interface UpdatePlanBookChanges {
	orderIndex?: number;
	chapterStart?: number | null;
	chapterEnd?: number | null;
	notes?: string | null;
	status?: "not_started" | "in_progress" | "completed";
	statusManual?: boolean;
	startedAt?: Date | null;
	completedAt?: Date | null;
}

export async function updatePlanBook(planBookId: string, changes: UpdatePlanBookChanges) {
	const patch: Record<string, unknown> = {};
	if (changes.orderIndex !== undefined) patch.orderIndex = changes.orderIndex;
	if (changes.chapterStart !== undefined) patch.chapterStart = changes.chapterStart;
	if (changes.chapterEnd !== undefined) patch.chapterEnd = changes.chapterEnd;
	if (changes.notes !== undefined) patch.notes = changes.notes;
	if (changes.status !== undefined) patch.status = changes.status;
	if (changes.statusManual !== undefined) patch.statusManual = changes.statusManual;
	if (changes.startedAt !== undefined) patch.startedAt = changes.startedAt;
	if (changes.completedAt !== undefined) patch.completedAt = changes.completedAt;

	if (Object.keys(patch).length === 0) {
		return db.query.planBooks.findFirst({
			where: eq(planBooks.id, planBookId),
		});
	}

	const [updated] = await db
		.update(planBooks)
		.set(patch)
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

export async function reorderPlanBooks(planId: string, orderedPlanBookIds: string[]) {
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
	submissionId?: string | null;
}) {
	const [created] = await db
		.insert(readingLogs)
		.values({
			planBookId: input.planBookId,
			submissionId: input.submissionId ?? null,
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

export interface BatchReadingLogInput {
	planBookId: string;
	submissionId: string;
	entries: Array<{
		chapterStart: number;
		chapterEnd: number;
		verseStart?: number | null;
		verseEnd?: number | null;
	}>;
	note?: string | null;
	loggedAt?: string;
}

export async function createReadingLogsBatch(input: BatchReadingLogInput) {
	if (input.entries.length === 0) {
		return [];
	}

	const rows = input.entries.map((entry) => ({
		planBookId: input.planBookId,
		submissionId: input.submissionId,
		chapterStart: entry.chapterStart,
		chapterEnd: entry.chapterEnd,
		verseStart: entry.verseStart ?? null,
		verseEnd: entry.verseEnd ?? null,
		note: input.note ?? null,
		loggedAt: input.loggedAt,
	}));

	return db.insert(readingLogs).values(rows).returning();
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

function computeChaptersInScope(
	chapterCount: number,
	chapterStart: number | null,
	chapterEnd: number | null,
): { chapters: number[]; total: number } {
	if (chapterStart === null || chapterEnd === null) {
		return {
			chapters: Array.from({ length: chapterCount }, (_, i) => i + 1),
			total: chapterCount,
		};
	}

	const bounded = Math.min(chapterEnd, chapterCount);
	const start = Math.max(1, chapterStart);
	const chapters = [] as number[];
	for (let ch = start; ch <= bounded; ch += 1) {
		chapters.push(ch);
	}
	return { chapters, total: chapters.length };
}

/**
 * Returns the set of chapter numbers that have at least one reading log row.
 * A log with a range (chapterStart..chapterEnd) contributes every chapter in that range.
 */
async function listCoveredChapters(planBookId: string): Promise<Set<number>> {
	const rows = await db
		.select({
			chapterStart: readingLogs.chapterStart,
			chapterEnd: readingLogs.chapterEnd,
		})
		.from(readingLogs)
		.where(eq(readingLogs.planBookId, planBookId));

	const covered = new Set<number>();
	for (const row of rows) {
		for (let ch = row.chapterStart; ch <= row.chapterEnd; ch += 1) {
			covered.add(ch);
		}
	}
	return covered;
}

/**
 * Recomputes the plan_book status from the reading logs unless the user has
 * opted in to manual overrides via `status_manual`.
 *
 * - no logs → not_started
 * - some chapters logged → in_progress
 * - every chapter in scope logged → completed
 *
 * Also maintains `started_at` / `completed_at` timestamps.
 */
export async function recomputePlanBookStatus(planBookId: string) {
	const planBook = await db.query.planBooks.findFirst({
		where: eq(planBooks.id, planBookId),
		with: {
			book: true,
		},
	});
	if (!planBook) {
		return null;
	}

	if (planBook.statusManual) {
		return planBook;
	}

	const covered = await listCoveredChapters(planBookId);
	const scope = computeChaptersInScope(
		planBook.book.chapterCount,
		planBook.chapterStart,
		planBook.chapterEnd,
	);

	const coveredInScope = scope.chapters.filter((ch) => covered.has(ch));
	const nextStatus: "not_started" | "in_progress" | "completed" =
		coveredInScope.length === 0
			? "not_started"
			: coveredInScope.length >= scope.total
				? "completed"
				: "in_progress";

	const now = new Date();
	const patch: UpdatePlanBookChanges = {
		status: nextStatus,
	};

	if (nextStatus === "not_started") {
		patch.startedAt = null;
		patch.completedAt = null;
	} else {
		patch.startedAt = planBook.startedAt ?? now;
		patch.completedAt = nextStatus === "completed" ? planBook.completedAt ?? now : null;
	}

	if (
		patch.status === planBook.status &&
		patch.startedAt === planBook.startedAt &&
		patch.completedAt === planBook.completedAt
	) {
		return planBook;
	}

	const [updated] = await db
		.update(planBooks)
		.set(patch)
		.where(eq(planBooks.id, planBookId))
		.returning();

	return updated ?? planBook;
}

export async function getPlanProgressStats(planId: string): Promise<PlanAggregateStats> {
	const planBookRows = await db
		.select({
			id: planBooks.id,
			status: planBooks.status,
			chapterStart: planBooks.chapterStart,
			chapterEnd: planBooks.chapterEnd,
			chapterCount: books.chapterCount,
		})
		.from(planBooks)
		.innerJoin(books, eq(books.id, planBooks.bookId))
		.where(eq(planBooks.planId, planId));

	if (planBookRows.length === 0) {
		return {
			totalBooks: 0,
			completedBooks: 0,
			inProgressBooks: 0,
			notStartedBooks: 0,
			totalLogs: 0,
			totalChaptersLogged: 0,
			chaptersInScope: 0,
			chaptersCovered: 0,
		};
	}

	const logRows = await db
		.select({
			id: readingLogs.id,
			planBookId: readingLogs.planBookId,
			chapterStart: readingLogs.chapterStart,
			chapterEnd: readingLogs.chapterEnd,
		})
		.from(readingLogs)
		.innerJoin(planBooks, eq(planBooks.id, readingLogs.planBookId))
		.where(eq(planBooks.planId, planId));

	let totalLogs = 0;
	let totalChaptersLogged = 0;
	let chaptersInScope = 0;
	let chaptersCovered = 0;
	let completedBooks = 0;
	let inProgressBooks = 0;
	let notStartedBooks = 0;

	const logsByBook = new Map<string, Array<{ chapterStart: number; chapterEnd: number }>>();
	for (const row of logRows) {
		totalLogs += 1;
		totalChaptersLogged += row.chapterEnd - row.chapterStart + 1;
		const list = logsByBook.get(row.planBookId) ?? [];
		list.push({ chapterStart: row.chapterStart, chapterEnd: row.chapterEnd });
		logsByBook.set(row.planBookId, list);
	}

	for (const row of planBookRows) {
		const scope = computeChaptersInScope(row.chapterCount, row.chapterStart, row.chapterEnd);
		chaptersInScope += scope.total;
		const covered = new Set<number>();
		const logs = logsByBook.get(row.id) ?? [];
		for (const log of logs) {
			for (let ch = log.chapterStart; ch <= log.chapterEnd; ch += 1) {
				covered.add(ch);
			}
		}
		const inScopeCovered = scope.chapters.filter((ch) => covered.has(ch)).length;
		chaptersCovered += inScopeCovered;

		switch (row.status) {
			case "completed":
				completedBooks += 1;
				break;
			case "in_progress":
				inProgressBooks += 1;
				break;
			default:
				notStartedBooks += 1;
		}
	}

	return {
		totalBooks: planBookRows.length,
		completedBooks,
		inProgressBooks,
		notStartedBooks,
		totalLogs,
		totalChaptersLogged,
		chaptersInScope,
		chaptersCovered,
	};
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
			chapterStart: planBooks.chapterStart,
			chapterEnd: planBooks.chapterEnd,
			notes: planBooks.notes,
			status: planBooks.status,
			statusManual: planBooks.statusManual,
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

	// Coverage per book for the richer builder payload (used by per-book progress bars).
	const allLogs =
		rows.length === 0
			? []
			: await db
					.select({
						planBookId: readingLogs.planBookId,
						chapterStart: readingLogs.chapterStart,
						chapterEnd: readingLogs.chapterEnd,
					})
					.from(readingLogs)
					.where(
						inArray(
							readingLogs.planBookId,
							rows.map((row) => row.id),
						),
					);

	const coverageByBook = new Map<string, Set<number>>();
	for (const log of allLogs) {
		const covered = coverageByBook.get(log.planBookId) ?? new Set<number>();
		for (let ch = log.chapterStart; ch <= log.chapterEnd; ch += 1) {
			covered.add(ch);
		}
		coverageByBook.set(log.planBookId, covered);
	}

	const planBooksData: PlanBuilderBook[] = rows.map((row) => {
		const scope = computeChaptersInScope(row.book.chapterCount, row.chapterStart, row.chapterEnd);
		const covered = coverageByBook.get(row.id) ?? new Set<number>();
		const inScopeCovered = scope.chapters.filter((ch) => covered.has(ch)).length;

		return {
			...row,
			logCount: Number(row.logCount),
			chaptersInScope: scope.total,
			chaptersCovered: inScopeCovered,
		};
	});

	const stats = await getPlanProgressStats(planId);

	return {
		plan: {
			id: plan.id,
			userId: plan.userId,
			title: plan.title,
			description: plan.description,
			color: plan.color,
			icon: plan.icon,
			startDate: plan.startDate,
			targetEndDate: plan.targetEndDate,
			cadence: plan.cadence,
			archivedAt: plan.archivedAt,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		},
		planBooks: planBooksData,
		stats,
	};
}

function mapReadingLogRow(row: {
	id: string;
	planBookId: string;
	submissionId: string | null;
	chapterStart: number;
	chapterEnd: number;
	verseStart: number | null;
	verseEnd: number | null;
	note: string | null;
	loggedAt: string;
	createdAt: Date;
	planId: string;
	planTitle: string;
	planColor: string | null;
	planIcon: string | null;
	bookName: string;
	bookUsfmCode: string;
}): RecentLogEntry {
	return {
		id: row.id,
		planBookId: row.planBookId,
		submissionId: row.submissionId,
		planId: row.planId,
		planTitle: row.planTitle,
		planColor: row.planColor,
		planIcon: row.planIcon,
		bookName: row.bookName,
		bookUsfmCode: row.bookUsfmCode,
		chapterStart: row.chapterStart,
		chapterEnd: row.chapterEnd,
		verseStart: row.verseStart,
		verseEnd: row.verseEnd,
		note: row.note,
		loggedAt: row.loggedAt,
		createdAt: row.createdAt,
	};
}

export async function listRecentReadingLogsForPlan(planId: string, limit = 50) {
	const rows = await db
		.select({
			id: readingLogs.id,
			planBookId: readingLogs.planBookId,
			submissionId: readingLogs.submissionId,
			chapterStart: readingLogs.chapterStart,
			chapterEnd: readingLogs.chapterEnd,
			verseStart: readingLogs.verseStart,
			verseEnd: readingLogs.verseEnd,
			note: readingLogs.note,
			loggedAt: readingLogs.loggedAt,
			createdAt: readingLogs.createdAt,
			planId: plans.id,
			planTitle: plans.title,
			planColor: plans.color,
			planIcon: plans.icon,
			bookName: books.name,
			bookUsfmCode: books.usfmCode,
		})
		.from(readingLogs)
		.innerJoin(planBooks, eq(planBooks.id, readingLogs.planBookId))
		.innerJoin(plans, eq(plans.id, planBooks.planId))
		.innerJoin(books, eq(books.id, planBooks.bookId))
		.where(eq(plans.id, planId))
		.orderBy(desc(readingLogs.loggedAt), desc(readingLogs.createdAt))
		.limit(limit);

	return rows.map(mapReadingLogRow);
}

export async function listRecentReadingLogsForUser(userId: string, limit = 50) {
	const rows = await db
		.select({
			id: readingLogs.id,
			planBookId: readingLogs.planBookId,
			submissionId: readingLogs.submissionId,
			chapterStart: readingLogs.chapterStart,
			chapterEnd: readingLogs.chapterEnd,
			verseStart: readingLogs.verseStart,
			verseEnd: readingLogs.verseEnd,
			note: readingLogs.note,
			loggedAt: readingLogs.loggedAt,
			createdAt: readingLogs.createdAt,
			planId: plans.id,
			planTitle: plans.title,
			planColor: plans.color,
			planIcon: plans.icon,
			bookName: books.name,
			bookUsfmCode: books.usfmCode,
		})
		.from(readingLogs)
		.innerJoin(planBooks, eq(planBooks.id, readingLogs.planBookId))
		.innerJoin(plans, eq(plans.id, planBooks.planId))
		.innerJoin(books, eq(books.id, planBooks.bookId))
		.where(eq(plans.userId, userId))
		.orderBy(desc(readingLogs.loggedAt), desc(readingLogs.createdAt))
		.limit(limit);

	return rows.map(mapReadingLogRow);
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
