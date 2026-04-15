import { and, eq, inArray } from "drizzle-orm";
import { db, notification } from "@repo/database";

export async function markNotificationAsRead(userId: string, notificationId: string) {
	return await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
}

export async function markNotificationsAsRead(userId: string, ids: string[]) {
	if (ids.length === 0) {
		return;
	}
	return await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.userId, userId), inArray(notification.id, ids)));
}

export async function markAllNotificationsAsReadForUser(userId: string) {
	return await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.userId, userId), eq(notification.read, false)));
}
