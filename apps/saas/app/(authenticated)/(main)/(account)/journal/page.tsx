import { getSession } from "@auth/lib/server";
import { JournalView } from "@lectio/components/JournalView";
import { listPlans, loadUserRecentReadingLogs } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("lectio.journalPage");

	return {
		title: t("title"),
	};
}

export default async function JournalRoute() {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const [plans, entries] = await Promise.all([
		listPlans({ includeArchived: true }),
		loadUserRecentReadingLogs(200),
	]);

	return <JournalView initialPlans={plans} initialEntries={entries} />;
}
