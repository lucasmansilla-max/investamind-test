/**
 * Script to check webhook_logs table structure
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import { config } from "dotenv";

config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTable() {
  try {
    console.log("Checking webhook_logs table...");
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_logs'
      );
    `);
    
    console.log("Table exists:", tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'webhook_logs' 
        ORDER BY ordinal_position;
      `);
      
      console.log("\nColumns:");
      columns.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Count records
      const count = await pool.query(`SELECT COUNT(*) as count FROM webhook_logs`);
      console.log(`\nTotal records: ${count.rows[0].count}`);
      
      // Get recent records
      const recent = await pool.query(`
        SELECT id, source, event_type, status, created_at 
        FROM webhook_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (recent.rows.length > 0) {
        console.log("\nRecent records:");
        recent.rows.forEach((row: any) => {
          console.log(`  - ID: ${row.id}, Source: ${row.source}, Event: ${row.event_type}, Status: ${row.status}, Created: ${row.created_at}`);
        });
      } else {
        console.log("\nNo records found in webhook_logs table");
      }
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkTable();

