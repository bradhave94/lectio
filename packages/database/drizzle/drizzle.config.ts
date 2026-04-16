import { defineConfig } from "drizzle-kit";

// Migrations (and `drizzle-kit push` / `studio`) should go through a direct /
// session-pooled Postgres connection, not the transaction pooler. Supabase's
// transaction pooler (port 6543) does not support the session-scoped state
// drizzle-kit relies on and will cause migrations to hang or fail silently.
// Set `DIRECT_DATABASE_URL` to the direct connection string (port 5432) when
// your `DATABASE_URL` points at a transaction pooler. It falls back to
// `DATABASE_URL` so single-URL setups keep working.
const migrationUrl =
	process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
	throw new Error(
		"DIRECT_DATABASE_URL or DATABASE_URL must be set for drizzle-kit",
	);
}

export default defineConfig({
	dialect: "postgresql",
	schema: "./drizzle/schema/postgres.ts",
	out: "./drizzle/migrations",
	dbCredentials: {
		url: migrationUrl,
	},
});
