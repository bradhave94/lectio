import { getSession } from "@auth/lib/server";
import { LectioHome } from "@lectio/components/LectioHome";
import { listPlans, loadUserRecentReadingLogs } from "@lectio/lib/server";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const [activePlans, allPlans, recentLogs] = await Promise.all([
		listPlans(),
		listPlans({ includeArchived: true }),
		loadUserRecentReadingLogs(50),
	]);

	return (
		<LectioHome
			initialPlans={activePlans}
			initialArchivedPlans={allPlans}
			initialRecentLogs={recentLogs}
		/>
	);
}
