import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const run = path.join(process.cwd(), '.wyrmrest', 'browser-tests', randomUUID());
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7000 },
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8790',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: 'node dist/node/server/index.js',
    url: 'http://127.0.0.1:8790/api/health',
    reuseExistingServer: false,
    env: { PORT: '8790', HOST: '0.0.0.0', WYRMREST_HOME: run, WYRMREST_EXPORT_ROOT: path.join(run, 'exports') },
    timeout: 30_000,
  },
});
