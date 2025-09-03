import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    // headless false helps while developing; flip to true in CI
    headless: false,
    viewport: { width: 1280, height: 800 },
  },
  timeout: 60_000,
});
