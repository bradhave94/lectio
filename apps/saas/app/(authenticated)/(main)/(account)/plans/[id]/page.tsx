import { getSession } from "@auth/lib/server";
import { PlanBuilderPage } from "@lectio/components/PlanBuilderPage";
import { getPlanBuilder } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

interface PlanBuilderRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata() {
	const t = await getTranslations("lectio.builder");

	return {
		title: t("titleFallback"),
	};
}

export default async function PlanBuilderRoute({ params }: PlanBuilderRouteProps) {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const { id } = await params;
	if (!id) {
		notFound();
	}

	const builderData = await getPlanBuilder(id);
	if (!builderData) {
		notFound();
	}

	return <PlanBuilderPage planId={id} initialBuilderData={builderData} />;
}
