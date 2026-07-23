/**
 * Reset user data — delete all users, sessions, accounts, and verification records.
 * After running this, restart the server and visit /register to create a new account.
 *
 * Usage: deno run --allow-all extra/reset-user.ts
 */

import { DatabaseSync } from "node:sqlite";
import * as path from "@std/path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dir, "..", "data");
const dbPath = path.join(dataDir, "config.db");

const db = new DatabaseSync(dbPath);

console.log("Resetting user data in:", dbPath);

// Check which auth-related tables exist
const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user', 'session', 'account', 'verification')",
).all() as { name: string }[];

const existingTables = tables.map((t) => t.name);
console.log("Found auth tables:", existingTables.join(", ") || "(none)");

if (existingTables.length === 0) {
    console.log("No auth tables found. Nothing to reset.");
    Deno.exit(0);
}

// Delete in order respecting foreign keys: verification → session → account → user
const deleteOrder = ["verification", "session", "account", "user"];
db.exec("PRAGMA foreign_keys = OFF");

for (const table of deleteOrder) {
    if (!existingTables.includes(table)) continue;
    const count = db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number };
    console.log(`  ${table}: ${count.count} record(s)`);
    db.prepare(`DELETE FROM "${table}"`).run();
    console.log(`  -> Deleted all records from ${table}`);
}

db.exec("PRAGMA foreign_keys = ON");

console.log("\nDone! User data has been cleared.");
console.log("Next steps:");
console.log("  1. Restart the backend server");
console.log("  2. Visit http://localhost:47777/register to create a new account");
