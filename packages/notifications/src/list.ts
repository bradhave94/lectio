import { and, count, desc, eq } from "drizzle-orm";
import { db, notification } from "@repo/database";

import { resolveNotificationLink } from "./resolve-link";

export async function listNotificationsForUser(userId: string, options?: { take?: number }) {
	const take = options?.take ?? 50;
	const rows = await db.query.notification.findMany({
		where: eq(notification.userId, userId),
		orderBy: desc(notification.createdAt),
		limit: take,
	});
	return rows.map((row) => ({
		...row,
		link: resolveNotificationLink(row.link),
	}));
}

export async function countUnreadNotifications(userId: string) {
	const [result] = await db
		.select({ count: count() })
		.from(notification)
		.where(and(eq(notification.userId, userId), eq(notification.read, false)));
	return result?.count ?? 0;
}
