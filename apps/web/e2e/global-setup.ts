import { prepareDatabase } from "../src/test/integration/prepare-database";
import { resetAllData } from "./database";
import { e2eDatabaseUrl } from "./env";

export default async function globalSetup() {
  await prepareDatabase(e2eDatabaseUrl());
  await resetAllData();
}
