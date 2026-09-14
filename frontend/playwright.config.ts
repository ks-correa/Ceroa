import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:3000', browserName: 'chromium', trace: 'off' },
  webServer: {
    command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: false,
    env: { VITE_API_URL: process.env.E2E_API_URL || 'http://localhost:18080/api/v1' }
  }
});
