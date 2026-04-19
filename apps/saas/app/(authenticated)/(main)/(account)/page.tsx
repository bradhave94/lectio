import { getSession } from "@auth/lib/server";
import { LectioHome } from "@lectio/components/LectioHome";
import {
	listPlans,
	loadStatsActivity,
	loadStatsDailyGoal,
	loadStatsStreak,
	loadUserRecentReadingLogs,
	loadVerseOfDay,
} from "@lectio/lib/server";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const [
		activePlans,
		allPlans,
		recentLogs,
		verseOfDay,
		streak,
		activity,
		dailyGoal,
	] = await Promise.all([
		listPlans(),
		listPlans({ includeArchived: true }),
		loadUserRecentReadingLogs(50),
		loadVerseOfDay(),
		loadStatsStreak(),
		loadStatsActivity(),
		loadStatsDailyGoal(),
	]);

	return (
		<LectioHome
			initialPlans={activePlans}
			initialArchivedPlans={allPlans}
			initialRecentLogs={recentLogs}
			verseOfDay={verseOfDay}
			initialStreak={streak}
			initialActivity={activity}
			initialDailyGoal={dailyGoal}
		/>
	);
}
