import { defineConfig, devices } from '@playwright/test';

/**
 * 🧪 E2E Test Configuration for Science AI Assistant
 * Playwright configuration for comprehensive end-to-end testing
 */

export default defineConfig({
  testDir: './e2e',
  
  /* Maximum time one test can run */
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Parallel workers */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'e2e-results.json' }]
  ],
  
  /* Shared settings for all the projects */
  use: {
    /* Base URL for the web application */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Default action timeout */
    actionTimeout: 15000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'cd web && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
