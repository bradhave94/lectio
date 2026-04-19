import { getSession } from "@auth/lib/server";
import { PlanEditor } from "@lectio/components/PlanEditor";
import { getPlanBuilder } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

interface PlanEditRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata() {
	const t = await getTranslations("lectio.editor");

	return {
		title: t("titleFallback"),
	};
}

export default async function PlanEditRoute({ params }: PlanEditRouteProps) {
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

	return <PlanEditor planId={id} initialData={builderData} />;
}
