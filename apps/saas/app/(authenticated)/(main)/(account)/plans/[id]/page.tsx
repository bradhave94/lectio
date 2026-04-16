import { getSession } from "@auth/lib/server";
import { PlanJournalView } from "@lectio/components/PlanJournalView";
import { getPlanBuilder, loadPlanRecentReadingLogs } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

interface PlanRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata() {
	const t = await getTranslations("lectio.journal");

	return {
		title: t("titleFallback"),
	};
}

export default async function PlanJournalRoute({ params }: PlanRouteProps) {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const { id } = await params;
	if (!id) {
		notFound();
	}

	const [builderData, recentLogs] = await Promise.all([
		getPlanBuilder(id),
		loadPlanRecentReadingLogs(id, 50),
	]);
	if (!builderData) {
		notFound();
	}

	return (
		<PlanJournalView planId={id} initialBuilder={builderData} initialRecentLogs={recentLogs} />
	);
}
