import { getSession } from "@auth/lib/server";
import { PlanReadView } from "@lectio/components/PlanReadView";
import { getPlanBuilder, getPlanProgress } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

interface PlanReadRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata() {
	const t = await getTranslations("lectio.read");

	return {
		title: t("titleFallback"),
	};
}

export default async function PlanReadRoute({ params }: PlanReadRouteProps) {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const { id } = await params;
	if (!id) {
		notFound();
	}

	const [progressData, builderData] = await Promise.all([getPlanProgress(id), getPlanBuilder(id)]);
	if (!progressData || !builderData) {
		notFound();
	}

	return (
		<PlanReadView planId={id} initialProgress={progressData} initialBuilder={builderData} />
	);
}
