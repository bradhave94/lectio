import { db, notification, user, NotificationTarget, type NotificationType } from "@repo/database";
import { eq } from "drizzle-orm";
import type { Locale } from "@repo/i18n";
import { sendEmail } from "@repo/mail";

import { isNotificationDisabled } from "./preferences";
import { resolveNotificationLink } from "./resolve-link";

export async function createNotification(input: {
	userId: string;
	type: NotificationType;
	data?: Record<string, unknown>;
	link?: string | null;
	read?: boolean;
}) {
	const inAppDisabled = await isNotificationDisabled(
		input.userId,
		input.type,
		NotificationTarget.IN_APP,
	);

	const emailDisabled = await isNotificationDisabled(
		input.userId,
		input.type,
		NotificationTarget.EMAIL,
	);

	const absoluteLink = resolveNotificationLink(input.link);
	let created = null;

	if (!inAppDisabled) {
		const [row] = await db
			.insert(notification)
			.values({
				userId: input.userId,
				type: input.type,
				data: input.data ?? {},
				link: absoluteLink,
				read: input.read ?? false,
			})
			.returning();
		created = row ?? null;
	}

	if (!emailDisabled) {
		const [foundUser] = await db
			.select({ email: user.email, locale: user.locale })
			.from(user)
			.where(eq(user.id, input.userId))
			.limit(1);

		if (foundUser?.email) {
			const locale = (foundUser.locale as Locale | null | undefined) ?? undefined;
			const dataObj =
				input.data &&
				typeof input.data === "object" &&
				input.data !== null &&
				!Array.isArray(input.data)
					? (input.data as Record<string, unknown>)
					: {};
			const title =
				typeof dataObj.headline === "string" && dataObj.headline.length > 0
					? dataObj.headline
					: typeof dataObj.title === "string" && dataObj.title.length > 0
						? dataObj.title
						: String(input.type);
			const message = typeof dataObj.message === "string" ? dataObj.message : undefined;

			await sendEmail({
				to: foundUser.email,
				locale,
				templateId: "notification",
				context: {
					title,
					message,
					link: absoluteLink ?? undefined,
				},
			});
		}
	}

	return created;
}
