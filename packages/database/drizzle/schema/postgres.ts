import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const purchaseTypeEnum = pgEnum("PurchaseType", ["SUBSCRIPTION", "ONE_TIME"]);

export const notificationTypeEnum = pgEnum("NotificationType", ["WELCOME", "APP_UPDATE"]);

export const notificationTargetEnum = pgEnum("NotificationTarget", ["IN_APP", "EMAIL"]);

export const testamentValues = ["OT", "NT"] as const;
export const planBookResourceTypeValues = [
	"reading_plan",
	"video",
	"podcast",
	"book",
	"article",
	"other",
] as const;
export const planBookStatusValues = ["not_started", "in_progress", "completed"] as const;

export const user = pgTable("user", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	username: text("username").unique(),
	displayUsername: text("displayUsername"),
	role: text("role"),
	banned: boolean("banned").default(false),
	banReason: text("banReason"),
	banExpires: timestamp("banExpires"),
	twoFactorEnabled: boolean("twoFactorEnabled").default(false),
	onboardingComplete: boolean("onboardingComplete"),
	paymentsCustomerId: text("paymentsCustomerId"),
	locale: text("locale"),
	lastActiveOrganizationId: text("lastActiveOrganizationId"),
});

export const session = pgTable(
	"session",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		expiresAt: timestamp("expiresAt").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		updatedAt: timestamp("updatedAt")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonatedBy"),
		activeOrganizationId: text("activeOrganizationId"),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		accountId: text("accountId").notNull(),
		providerId: text("providerId").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("accessToken"),
		refreshToken: text("refreshToken"),
		idToken: text("idToken"),
		accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
		refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		updatedAt: timestamp("updatedAt")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expiresAt").notNull(),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		updatedAt: timestamp("updatedAt")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = pgTable(
	"passkey",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		name: text("name"),
		publicKey: text("publicKey").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		credentialID: text("credentialID").notNull(),
		counter: integer("counter").notNull(),
		deviceType: text("deviceType").notNull(),
		backedUp: boolean("backedUp").notNull(),
		transports: text("transports"),
		createdAt: timestamp("createdAt"),
		aaguid: text("aaguid"),
	},
	(table) => [
		index("passkey_userId_idx").on(table.userId),
		index("passkey_credentialID_idx").on(table.credentialID),
	],
);

export const organization = pgTable(
	"organization",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		logo: text("logo"),
		createdAt: timestamp("createdAt").notNull(),
		metadata: text("metadata"),
		paymentsCustomerId: text("paymentsCustomerId"),
	},
	(table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const member = pgTable(
	"member",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").default("member").notNull(),
		createdAt: timestamp("createdAt").notNull(),
	},
	(table) => [
		index("member_organizationId_idx").on(table.organizationId),
		index("member_userId_idx").on(table.userId),
	],
);

export const invitation = pgTable(
	"invitation",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").default("pending").notNull(),
		expiresAt: timestamp("expiresAt").notNull(),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		inviterId: text("inviterId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("invitation_organizationId_idx").on(table.organizationId),
		index("invitation_email_idx").on(table.email),
	],
);

export const twoFactor = pgTable(
	"twoFactor",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		secret: text("secret").notNull(),
		backupCodes: text("backupCodes").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("twoFactor_secret_idx").on(table.secret),
		index("twoFactor_userId_idx").on(table.userId),
	],
);

export const purchase = pgTable("purchase", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId").references(() => organization.id, {
		onDelete: "cascade",
	}),
	userId: text("userId").references(() => user.id, {
		onDelete: "cascade",
	}),
	type: purchaseTypeEnum("type").notNull(),
	customerId: text("customerId").notNull(),
	subscriptionId: text("subscriptionId").unique(),
	priceId: text("priceId").notNull(),
	status: text("status"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt"),
});

export const notification = pgTable(
	"notification",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: notificationTypeEnum("type").notNull(),
		data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
		link: text("link"),
		read: boolean("read").notNull().default(false),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		updatedAt: timestamp("updatedAt")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("notification_userId_idx").on(table.userId)],
);

export const userNotificationPreference = pgTable(
	"user_notification_preference",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: notificationTypeEnum("type").notNull(),
		target: notificationTargetEnum("target").notNull(),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
	},
	(table) => [
		index("user_notification_preference_userId_idx").on(table.userId),
		uniqueIndex("user_notification_preference_user_type_target_uidx").on(
			table.userId,
			table.type,
			table.target,
		),
	],
);

export const books = pgTable(
	"books",
	{
		id: serial("id").primaryKey(),
		usfmCode: text("usfm_code").notNull(),
		name: text("name").notNull(),
		testament: text("testament").notNull(),
		canonOrder: integer("canon_order").notNull(),
		chapterCount: integer("chapter_count").notNull(),
	},
	(table) => [
		uniqueIndex("books_usfm_code_uidx").on(table.usfmCode),
		uniqueIndex("books_canon_order_uidx").on(table.canonOrder),
		check("books_testament_check", sql`${table.testament} IN ('OT', 'NT')`),
	],
);

export const bookChapters = pgTable(
	"book_chapters",
	{
		id: serial("id").primaryKey(),
		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, { onDelete: "cascade" }),
		chapterNum: integer("chapter_num").notNull(),
		verseCount: integer("verse_count").notNull(),
	},
	(table) => [
		uniqueIndex("book_chapters_book_chapter_uidx").on(table.bookId, table.chapterNum),
		index("book_chapters_book_id_idx").on(table.bookId),
	],
);

export const plans = pgTable(
	"plans",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("plans_user_id_idx").on(table.userId)],
);

export const planBooks = pgTable(
	"plan_books",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		planId: uuid("plan_id")
			.notNull()
			.references(() => plans.id, { onDelete: "cascade" }),
		bookId: integer("book_id")
			.notNull()
			.references(() => books.id),
		orderIndex: integer("order_index").notNull(),
		resourceUrl: text("resource_url"),
		resourceLabel: text("resource_label"),
		resourceType: text("resource_type"),
		notes: text("notes"),
		status: text("status").notNull().default("not_started"),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("plan_books_plan_book_uidx").on(table.planId, table.bookId),
		index("plan_books_plan_order_idx").on(table.planId, table.orderIndex),
		index("plan_books_plan_id_idx").on(table.planId),
		index("plan_books_book_id_idx").on(table.bookId),
		check(
			"plan_books_resource_type_check",
			sql`${table.resourceType} IS NULL OR ${table.resourceType} IN ('reading_plan', 'video', 'podcast', 'book', 'article', 'other')`,
		),
		check(
			"plan_books_status_check",
			sql`${table.status} IN ('not_started', 'in_progress', 'completed')`,
		),
	],
);

export const readingLogs = pgTable(
	"reading_logs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		planBookId: uuid("plan_book_id")
			.notNull()
			.references(() => planBooks.id, { onDelete: "cascade" }),
		chapterStart: integer("chapter_start").notNull(),
		chapterEnd: integer("chapter_end").notNull(),
		verseStart: integer("verse_start"),
		verseEnd: integer("verse_end"),
		note: text("note"),
		loggedAt: date("logged_at").notNull().default(sql`CURRENT_DATE`),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("reading_logs_plan_book_idx").on(table.planBookId),
		index("reading_logs_plan_book_logged_at_idx").on(table.planBookId, table.loggedAt),
		check("reading_logs_chapter_range_check", sql`${table.chapterEnd} >= ${table.chapterStart}`),
		check(
			"reading_logs_verse_range_check",
			sql`(${table.verseStart} IS NULL AND ${table.verseEnd} IS NULL) OR (${table.verseStart} IS NOT NULL AND ${table.verseEnd} IS NOT NULL AND ${table.verseEnd} >= ${table.verseStart})`,
		),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	passkeys: many(passkey),
	members: many(member),
	invitations: many(invitation),
	twoFactors: many(twoFactor),
	purchases: many(purchase),
	notifications: many(notification),
	notificationPreferences: many(userNotificationPreference),
	plans: many(plans),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),

	purchases: many(purchase),
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id],
	}),
}));

export const purchaseRelations = relations(purchase, ({ one }) => ({
	organization: one(organization, {
		fields: [purchase.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [purchase.userId],
		references: [user.id],
	}),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
	}),
}));

export const userNotificationPreferenceRelations = relations(
	userNotificationPreference,
	({ one }) => ({
		user: one(user, {
			fields: [userNotificationPreference.userId],
			references: [user.id],
		}),
	}),
);

export const booksRelations = relations(books, ({ many }) => ({
	chapters: many(bookChapters),
	planBooks: many(planBooks),
}));

export const bookChaptersRelations = relations(bookChapters, ({ one }) => ({
	book: one(books, {
		fields: [bookChapters.bookId],
		references: [books.id],
	}),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
	user: one(user, {
		fields: [plans.userId],
		references: [user.id],
	}),
	planBooks: many(planBooks),
}));

export const planBooksRelations = relations(planBooks, ({ one, many }) => ({
	plan: one(plans, {
		fields: [planBooks.planId],
		references: [plans.id],
	}),
	book: one(books, {
		fields: [planBooks.bookId],
		references: [books.id],
	}),
	readingLogs: many(readingLogs),
}));

export const readingLogsRelations = relations(readingLogs, ({ one }) => ({
	planBook: one(planBooks, {
		fields: [readingLogs.planBookId],
		references: [planBooks.id],
	}),
}));
