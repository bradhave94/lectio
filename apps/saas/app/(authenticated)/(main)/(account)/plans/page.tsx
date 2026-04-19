import { getSession } from "@auth/lib/server";
import { PlansIndexView } from "@lectio/components/PlansIndexView";
import { listPlans } from "@lectio/lib/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
	const t = await getTranslations("lectio.plansIndex");

	return {
		title: t("title"),
	};
}

export default async function PlansIndexRoute() {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	const [activePlans, allPlans] = await Promise.all([
		listPlans(),
		listPlans({ includeArchived: true }),
	]);

	return <PlansIndexView initialActivePlans={activePlans} initialAllPlans={allPlans} />;
}
