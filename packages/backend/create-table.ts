import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.DATABASE_URL!,
});

async function run() {
  try {
    console.log(`Conectando ao banco de dados: ${process.env.DATABASE_URL?.split('?')[0]}...`);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        providerId TEXT UNIQUE NOT NULL,
        avatarUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);
    console.log("✅ Tabela 'users' criada com sucesso no Turso!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao criar a tabela:", err);
    process.exit(1);
  }
}

run();
