import { PlanBuilderClient } from "@lectio/components/PlanBuilderClient";
import type { BuilderResponse } from "@lectio/hooks/use-lectio";
import { Button } from "@repo/ui";
import { PageHeader } from "@shared/components/PageHeader";
import { ArrowLeftIcon, BarChart3Icon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface PlanBuilderPageProps {
	planId: string;
	initialBuilderData: BuilderResponse;
}

export async function PlanBuilderPage({ planId, initialBuilderData }: PlanBuilderPageProps) {
	const t = await getTranslations("lectio");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-2">
					<Link
						href={`/plans/${planId}`}
						className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeftIcon className="mr-1 size-4" />
						{t("builder.backToReading")}
					</Link>
					<PageHeader
						title={initialBuilderData.plan.title || t("builder.titleFallback")}
						className="mb-0"
					/>
				</div>

				<Button asChild variant="outline">
					<Link href={`/plans/${planId}/progress`}>
						<BarChart3Icon className="mr-1.5 size-4" />
						{t("builder.viewProgress")}
					</Link>
				</Button>
			</div>

			<PlanBuilderClient planId={planId} initialData={initialBuilderData} />
		</div>
	);
}
