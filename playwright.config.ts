import { defineConfig } from '@playwright/test';
const port = process.env.COMMONPLACE_TEST_PORT || '43117';
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: 'node scripts/browser-server.cjs', url: `${baseURL}/api/study`, reuseExistingServer: false, timeout: 120_000 },
});
