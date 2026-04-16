import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/**
 * Applies pending drizzle migrations against the configured Postgres database.
 *
 * Prefers `DIRECT_DATABASE_URL` (direct / session-pooled connection) and falls
 * back to `DATABASE_URL`. Running migrations through Supabase's transaction
 * pooler (port 6543) is not supported — set `DIRECT_DATABASE_URL` to the
 * direct connection string instead.
 *
 * Unlike `drizzle-kit migrate`, this script prints real error messages if a
 * migration fails.
 */
async function main() {
	const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

	if (!url) {
		throw new Error(
			"DIRECT_DATABASE_URL or DATABASE_URL must be set to run migrations",
		);
	}

	const db = drizzle(url);

	console.log("Applying migrations...");
	await migrate(db, { migrationsFolder: "./drizzle/migrations" });
	console.log("Migrations applied successfully.");

	await db.$client.end();
}

main().catch((error) => {
	console.error("Migration failed:");
	console.error(error);
	process.exit(1);
});
