const TEST_SUFFIX = "_test";

export function testDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL or TEST_DATABASE_URL is required for integration tests");

  const url = new URL(env.DATABASE_URL);
  if (!url.pathname.endsWith(TEST_SUFFIX)) url.pathname += TEST_SUFFIX;
  return url.toString();
}

export function databaseName(connectionString: string) {
  return new URL(connectionString).pathname.slice(1);
}

export function isTestDatabase(name: string) {
  return name.endsWith(TEST_SUFFIX);
}
