import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: '**/mobile.spec.ts', use: { channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { channel: 'chrome', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-webkit', testMatch: '**/mobile.spec.ts', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
