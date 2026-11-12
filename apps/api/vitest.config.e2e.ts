import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Boots the real AppModule; auth's Apple verifier requires this at
    // startup (fail-fast), but no e2e spec here exercises Apple sign-in.
    env: { APPLE_BUNDLE_ID: 'com.zentlet.app.test' },
  },
});
