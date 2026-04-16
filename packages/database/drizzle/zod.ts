import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import {
	account,
	bookChapters,
	books,
	invitation,
	member,
	notification,
	notificationTargetEnum,
	notificationTypeEnum,
	organization,
	passkey,
	planBooks,
	plans,
	purchase,
	readingLogs,
	session,
	user,
	userNotificationPreference,
	verification,
} from "./schema";

export const UserSchema = createSelectSchema(user);
export const UserUpdateSchema = createUpdateSchema(user, {
	id: z.string(),
});
export const OrganizationSchema = createSelectSchema(organization);
export const OrganizationUpdateSchema = createUpdateSchema(organization, {
	id: z.string(),
});
export const MemberSchema = createSelectSchema(member);
export const InvitationSchema = createSelectSchema(invitation);
export const PurchaseSchema = createSelectSchema(purchase);
export type Purchase = typeof purchase.$inferSelect;
export const PurchaseInsertSchema = createInsertSchema(purchase);
export const PurchaseUpdateSchema = createUpdateSchema(purchase, {
	id: z.string(),
});
export const SessionSchema = createSelectSchema(session);
export const AccountSchema = createSelectSchema(account);
export const VerificationSchema = createSelectSchema(verification);
export const PasskeySchema = createSelectSchema(passkey);
export const NotificationSchema = createSelectSchema(notification);
export const NotificationInsertSchema = createInsertSchema(notification);
export const NotificationUpdateSchema = createUpdateSchema(notification, {
	id: z.string(),
});
export type Notification = typeof notification.$inferSelect;
export const UserNotificationPreferenceSchema = createSelectSchema(userNotificationPreference);
export const UserNotificationPreferenceInsertSchema = createInsertSchema(
	userNotificationPreference,
);
export const UserNotificationPreferenceUpdateSchema = createUpdateSchema(
	userNotificationPreference,
	{
		id: z.string(),
	},
);
export type UserNotificationPreference = typeof userNotificationPreference.$inferSelect;
export const BookSchema = createSelectSchema(books);
export const BookInsertSchema = createInsertSchema(books);
export const BookChapterSchema = createSelectSchema(bookChapters);
export const BookChapterInsertSchema = createInsertSchema(bookChapters);
export const PlanSchema = createSelectSchema(plans);
export const PlanInsertSchema = createInsertSchema(plans);
export const PlanUpdateSchema = createUpdateSchema(plans, {
	id: z.uuid(),
});
export type Plan = typeof plans.$inferSelect;
export const PlanBookSchema = createSelectSchema(planBooks);
export const PlanBookInsertSchema = createInsertSchema(planBooks);
export const PlanBookUpdateSchema = createUpdateSchema(planBooks, {
	id: z.uuid(),
});
export type PlanBook = typeof planBooks.$inferSelect;

export const PLAN_COLOR_VALUES = [
	"emerald",
	"sky",
	"violet",
	"amber",
	"rose",
	"slate",
] as const;
export type PlanColor = (typeof PLAN_COLOR_VALUES)[number];

export const PLAN_ICON_VALUES = [
	"BookOpen",
	"Sparkles",
	"Sun",
	"Flame",
	"Mountain",
	"Leaf",
	"Compass",
	"Heart",
] as const;
export type PlanIcon = (typeof PLAN_ICON_VALUES)[number];
export const ReadingLogSchema = createSelectSchema(readingLogs);
export const ReadingLogInsertSchema = createInsertSchema(readingLogs);
export const ReadingLogUpdateSchema = createUpdateSchema(readingLogs, {
	id: z.uuid(),
});
export type ReadingLog = typeof readingLogs.$inferSelect;

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export const NotificationTarget = {
	IN_APP: "IN_APP",
	EMAIL: "EMAIL",
} as const;
export type NotificationTarget = (typeof notificationTargetEnum.enumValues)[number];
