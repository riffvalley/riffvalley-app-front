import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/maintenance.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "maintenance",
      testMatch: "**/maintenance.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4174" },
    },
  ],
  webServer: [{
    command: "yarn vite --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/login",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  }, {
    command: "VITE_MAINTENANCE_MODE=true yarn vite --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174/maintenance",
    reuseExistingServer: false,
    timeout: 30_000,
  }],
});
