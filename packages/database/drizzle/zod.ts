import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import {
	account,
	invitation,
	member,
	notification,
	notificationTargetEnum,
	notificationTypeEnum,
	organization,
	passkey,
	purchase,
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

export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export const NotificationTarget = {
	IN_APP: "IN_APP",
	EMAIL: "EMAIL",
} as const;
export type NotificationTarget = (typeof notificationTargetEnum.enumValues)[number];
