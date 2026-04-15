import { and, eq } from "drizzle-orm";
import {
	db,
	userNotificationPreference,
	type NotificationTarget,
	type NotificationType,
} from "@repo/database";

export async function getDisabledNotificationPreferences(userId: string) {
	return await db.query.userNotificationPreference.findMany({
		where: eq(userNotificationPreference.userId, userId),
		columns: { type: true, target: true },
	});
}

export async function isNotificationDisabled(
	userId: string,
	type: NotificationType,
	target: NotificationTarget,
) {
	const row = await db.query.userNotificationPreference.findFirst({
		where: and(
			eq(userNotificationPreference.userId, userId),
			eq(userNotificationPreference.type, type),
			eq(userNotificationPreference.target, target),
		),
	});
	return Boolean(row);
}

export async function setNotificationDisabled(
	userId: string,
	type: NotificationType,
	target: NotificationTarget,
	disabled: boolean,
) {
	if (disabled) {
		await db
			.insert(userNotificationPreference)
			.values({ userId, type, target })
			.onConflictDoNothing();
	} else {
		await db
			.delete(userNotificationPreference)
			.where(
				and(
					eq(userNotificationPreference.userId, userId),
					eq(userNotificationPreference.type, type),
					eq(userNotificationPreference.target, target),
				),
			);
	}
}
