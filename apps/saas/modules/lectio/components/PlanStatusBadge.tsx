"use client";

import { STATUS_LABELS, type PlanBookStatus } from "@lectio/lib/constants";
import { Badge } from "@repo/ui";
import { useTranslations } from "next-intl";

interface PlanStatusBadgeProps {
	status: PlanBookStatus;
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
	const t = useTranslations("lectio");

	if (status === "completed") {
		return <Badge status="success">{t(STATUS_LABELS.completed)}</Badge>;
	}

	if (status === "in_progress") {
		return <Badge status="info">{t(STATUS_LABELS.in_progress)}</Badge>;
	}

	return <Badge status="warning">{t(STATUS_LABELS.not_started)}</Badge>;
}
