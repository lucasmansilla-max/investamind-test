/**
 * Script to run the webhook_logs table migration
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables
config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log("Reading migration file...");
    const migrationPath = join(process.cwd(), "drizzle/migrations/0002_create_webhook_logs.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Executing migration...");
    await pool.query(migrationSQL);
    
    console.log("✓ Migration completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("✗ Migration failed:", error.message);
    if (error.code === '42P07') {
      console.log("Note: Table might already exist. This is okay.");
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

