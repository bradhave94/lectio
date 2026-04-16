import { getSession } from "@auth/lib/server";
import { PlanProgressView } from "@lectio/components/PlanProgressView";
import { getPlanProgress } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

interface PlanProgressRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata() {
	const t = await getTranslations("lectio.progress");

	return {
		title: t("title"),
	};
}

export default async function PlanProgressRoute({ params }: PlanProgressRouteProps) {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const { id } = await params;
	if (!id) {
		notFound();
	}

	const progressData = await getPlanProgress(id);
	if (!progressData) {
		notFound();
	}

	return <PlanProgressView planId={id} initialData={progressData} />;
}
