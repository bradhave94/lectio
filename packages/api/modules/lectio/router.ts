import { addPlanBooksProcedure } from "./procedures/add-plan-books";
import { createPlanProcedure } from "./procedures/create-plan";
import { deletePlanProcedure } from "./procedures/delete-plan";
import { deleteReadingLogProcedure } from "./procedures/delete-reading-log";
import { getPlanBuilderProcedure } from "./procedures/get-plan-builder";
import { getVerseOfDayProcedure } from "./procedures/get-verse-of-day";
import { listBookChaptersProcedure } from "./procedures/list-book-chapters";
import { listBooksProcedure } from "./procedures/list-books";
import { listPlansProcedure } from "./procedures/list-plans";
import { listReadingLogsProcedure } from "./procedures/list-reading-logs";
import { listRecentPlanLogsProcedure } from "./procedures/list-recent-plan-logs";
import { listRecentUserLogsProcedure } from "./procedures/list-recent-user-logs";
import { logReadingProcedure } from "./procedures/log-reading";
import { removePlanBookProcedure } from "./procedures/remove-plan-book";
import { reorderPlanBooksProcedure } from "./procedures/reorder-plan-books";
import { updatePlanProcedure } from "./procedures/update-plan";
import { updatePlanBookProcedure } from "./procedures/update-plan-book";

export const lectioRouter = {
	books: {
		list: listBooksProcedure,
		chapters: listBookChaptersProcedure,
	},
	plans: {
		list: listPlansProcedure,
		create: createPlanProcedure,
		update: updatePlanProcedure,
		delete: deletePlanProcedure,
		builder: getPlanBuilderProcedure,
		recentLogs: listRecentPlanLogsProcedure,
	},
	planBooks: {
		addMany: addPlanBooksProcedure,
		update: updatePlanBookProcedure,
		remove: removePlanBookProcedure,
		reorder: reorderPlanBooksProcedure,
	},
	readingLogs: {
		list: listReadingLogsProcedure,
		log: logReadingProcedure,
		delete: deleteReadingLogProcedure,
		recent: listRecentUserLogsProcedure,
	},
	verseOfDay: {
		get: getVerseOfDayProcedure,
	},
};
