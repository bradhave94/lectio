import { getSession } from "@auth/lib/server";
import { ORPCError } from "@orpc/client";
import { getPlanBuilderProcedure } from "@repo/api/modules/lectio/procedures/get-plan-builder";
import { getStatsActivityProcedure } from "@repo/api/modules/lectio/procedures/get-stats-activity";
import { getStatsDailyGoalProcedure } from "@repo/api/modules/lectio/procedures/get-stats-daily-goal";
import { getStatsStreakProcedure } from "@repo/api/modules/lectio/procedures/get-stats-streak";
import { getVerseOfDayProcedure } from "@repo/api/modules/lectio/procedures/get-verse-of-day";
import { listPlansProcedure } from "@repo/api/modules/lectio/procedures/list-plans";
import { listRecentPlanLogsProcedure } from "@repo/api/modules/lectio/procedures/list-recent-plan-logs";
import { listRecentUserLogsProcedure } from "@repo/api/modules/lectio/procedures/list-recent-user-logs";
import { headers } from "next/headers";
import { cache } from "react";

import type {
	BuilderResponse,
	PlanRecentLogsResponse,
	PlansListResponse,
	RecentLogsResponse,
	StatsActivityResponse,
	StatsDailyGoalResponse,
	StatsStreakResponse,
	VerseOfDayResponse,
} from "../hooks/use-lectio";

export type DashboardPlans = PlansListResponse;
export type DashboardVerseOfDay = VerseOfDayResponse;
export type BuilderPageData = BuilderResponse;
export type DashboardRecentLogs = RecentLogsResponse;
export type PlanRecentLogs = PlanRecentLogsResponse;

export const listPlans = cache(
	async (options: { includeArchived?: boolean } = {}): Promise<DashboardPlans> => {
		const session = await getSession();
		if (!session) {
			throw new ORPCError("UNAUTHORIZED");
		}

		const callable = listPlansProcedure.callable({
			context: { headers: await headers() },
		});

		return callable({
			includeArchived: options.includeArchived ?? false,
		});
	},
);

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

export const loadUserRecentReadingLogs = cache(async (limit = 30): Promise<DashboardRecentLogs> => {
	const session = await getSession();
	if (!session) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const callable = listRecentUserLogsProcedure.callable({
		context: { headers: await headers() },
	});

	return callable({ limit });
});

export const loadPlanRecentReadingLogs = cache(
	async (planId: string, limit = 50): Promise<PlanRecentLogs> => {
		const session = await getSession();
		if (!session) {
			throw new ORPCError("UNAUTHORIZED");
		}

		const callable = listRecentPlanLogsProcedure.callable({
			context: { headers: await headers() },
		});

		return callable({ planId, limit });
	},
);

export const loadStatsStreak = cache(async (): Promise<StatsStreakResponse> => {
	const session = await getSession();
	if (!session) throw new ORPCError("UNAUTHORIZED");
	const callable = getStatsStreakProcedure.callable({
		context: { headers: await headers() },
	});
	return callable({});
});

export const loadStatsActivity = cache(async (): Promise<StatsActivityResponse> => {
	const session = await getSession();
	if (!session) throw new ORPCError("UNAUTHORIZED");
	const callable = getStatsActivityProcedure.callable({
		context: { headers: await headers() },
	});
	return callable({});
});

export const loadStatsDailyGoal = cache(async (): Promise<StatsDailyGoalResponse> => {
	const session = await getSession();
	if (!session) throw new ORPCError("UNAUTHORIZED");
	const callable = getStatsDailyGoalProcedure.callable({
		context: { headers: await headers() },
	});
	return callable({});
});
