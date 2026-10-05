import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { databaseName, isTestDatabase } from "./test-database-url";

function adminUrl(connectionString: string) {
  const url = new URL(connectionString);
  url.pathname = "/postgres";
  url.search = "";
  return url.toString();
}

async function ensureDatabase(connectionString: string) {
  const name = databaseName(connectionString);
  if (!isTestDatabase(name)) throw new Error(`Refusing to prepare "${name}" as a test database`);

  const client = new Client({ connectionString: adminUrl(connectionString) });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}

export async function prepareDatabase(connectionString: string) {
  await ensureDatabase(connectionString);
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: connectionString, DIRECT_URL: connectionString },
    stdio: "pipe",
  });
}
