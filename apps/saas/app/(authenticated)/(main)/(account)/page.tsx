import { getSession } from "@auth/lib/server";
import { MyPlansDashboard } from "@lectio/components/MyPlansDashboard";
import { listPlans, loadVerseOfDay } from "@lectio/lib/server";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const [plans, verseOfDay] = await Promise.all([listPlans(), loadVerseOfDay()]);

	return (
		<MyPlansDashboard
			initialPlans={plans}
			verseOfDay={verseOfDay}
		/>
	);
}
