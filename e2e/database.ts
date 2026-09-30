import { Client } from "pg";
import { databaseName, isTestDatabase } from "../src/test/integration/test-database-url";
import { e2eDatabaseUrl } from "./env";

const BILLING_TABLES = '"billing_event", "billing_payment", "subscription", "usage_limit", "budget"';

async function run(sql: string) {
  const connectionString = e2eDatabaseUrl();
  if (!isTestDatabase(databaseName(connectionString))) throw new Error("Refusing to modify a non-test database");

  const url = new URL(connectionString);
  url.search = "";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export const resetBillingData = () => run(`TRUNCATE ${BILLING_TABLES} CASCADE`);
export const resetAllData = () => run(`TRUNCATE ${BILLING_TABLES}, "user" CASCADE`);
