import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base,
  testMatch: 'assistant-ui.spec.ts',
  use: { baseURL: 'http://localhost:3001' },
  webServer: { command: 'npm run dev -- --port 3001', url: 'http://localhost:3001', reuseExistingServer: false },
});
