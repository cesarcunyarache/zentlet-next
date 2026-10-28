import "dotenv/config";
import { prepareDatabase } from "./prepare-database";
import { testDatabaseUrl } from "./test-database-url";

export default async function setup() {
  await prepareDatabase(testDatabaseUrl());
}
