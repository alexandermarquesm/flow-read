import { libsqlClient as client } from "./libsql";
import fs from "fs";
import path from "path";

async function setup() {
  console.log("Setting up database...");
  
  const migrationPath = path.join(__dirname, "migrations", "001_create_users.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  
  try {
    // Drop the table to fix schema mismatch (camelCase vs snake_case) if it has no data
    const rs = await client.execute("SELECT count(*) as count FROM users").catch(() => ({ rows: [{ count: 0 }] }));
    const count = (rs.rows[0] as any).count;
    
    if (count === 0) {
      console.log("Dropping existing empty users table to fix schema...");
      await client.execute("DROP TABLE IF EXISTS users");
    }

    await client.execute(sql);
    console.log("Users table created successfully with correct schema.");
  } catch (error) {
    console.error("Error creating users table:", error);
  }
}

setup();
