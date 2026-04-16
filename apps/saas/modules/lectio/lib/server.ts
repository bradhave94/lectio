import { getSession } from "@auth/lib/server";
import { ORPCError } from "@orpc/client";
import { getPlanBuilderProcedure } from "@repo/api/modules/lectio/procedures/get-plan-builder";
import { getPlanProgressProcedure } from "@repo/api/modules/lectio/procedures/get-plan-progress";
import { getVerseOfDayProcedure } from "@repo/api/modules/lectio/procedures/get-verse-of-day";
import { listPlansProcedure } from "@repo/api/modules/lectio/procedures/list-plans";
import { headers } from "next/headers";
import { cache } from "react";

import type {
	BuilderResponse,
	PlansListResponse,
	ProgressResponse,
	VerseOfDayResponse,
} from "../hooks/use-lectio";

export type DashboardPlans = PlansListResponse;
export type DashboardVerseOfDay = VerseOfDayResponse;
export type BuilderPageData = BuilderResponse;
export type ProgressPageData = ProgressResponse;

export const listPlans = cache(async (): Promise<DashboardPlans> => {
	const session = await getSession();
	if (!session) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const callable = listPlansProcedure.callable({
		context: { headers: await headers() },
	});

	return callable({
		includeArchived: false,
	});
});

export const loadVerseOfDay = cache(async (): Promise<DashboardVerseOfDay> => {
	const callable = getVerseOfDayProcedure.callable({
		context: { headers: await headers() },
	});

	try {
		return await callable({});
	} catch {
		return null;
	}
});

export const getPlanBuilder = cache(async (planId: string): Promise<BuilderPageData | null> => {
	const session = await getSession();
	if (!session) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const callable = getPlanBuilderProcedure.callable({
		context: { headers: await headers() },
	});

	return callable({
		planId,
	});
});

export const getPlanProgress = cache(async (planId: string): Promise<ProgressPageData | null> => {
	const session = await getSession();
	if (!session) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const callable = getPlanProgressProcedure.callable({
		context: { headers: await headers() },
	});

	return callable({
		planId,
	});
});
