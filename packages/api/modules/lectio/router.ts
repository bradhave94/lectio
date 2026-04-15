import { addPlanBookProcedure } from "./procedures/add-plan-book";
import { createPlanProcedure } from "./procedures/create-plan";
import { createReadingLogProcedure } from "./procedures/create-reading-log";
import { deletePlanProcedure } from "./procedures/delete-plan";
import { deleteReadingLogProcedure } from "./procedures/delete-reading-log";
import { getPlanBuilderProcedure } from "./procedures/get-plan-builder";
import { getPlanProgressProcedure } from "./procedures/get-plan-progress";
import { getVerseOfDayProcedure } from "./procedures/get-verse-of-day";
import { listBookChaptersProcedure } from "./procedures/list-book-chapters";
import { listBooksProcedure } from "./procedures/list-books";
import { listPlansProcedure } from "./procedures/list-plans";
import { listReadingLogsProcedure } from "./procedures/list-reading-logs";
import { removePlanBookProcedure } from "./procedures/remove-plan-book";
import { reorderPlanBooksProcedure } from "./procedures/reorder-plan-books";
import { updatePlanBookProcedure } from "./procedures/update-plan-book";
import { updatePlanProcedure } from "./procedures/update-plan";

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
		progress: getPlanProgressProcedure,
	},
	planBooks: {
		add: addPlanBookProcedure,
		update: updatePlanBookProcedure,
		remove: removePlanBookProcedure,
		reorder: reorderPlanBooksProcedure,
	},
	readingLogs: {
		list: listReadingLogsProcedure,
		create: createReadingLogProcedure,
		delete: deleteReadingLogProcedure,
	},
	verseOfDay: {
		get: getVerseOfDayProcedure,
	},
};
