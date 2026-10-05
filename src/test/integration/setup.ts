import "dotenv/config";
import { testDatabaseUrl } from "./test-database-url";

process.env.DATABASE_URL = testDatabaseUrl();
process.env.BILLING_ADMIN_SECRET = "integration-admin-secret";
process.env.CRON_SECRET = "integration-cron-secret";
