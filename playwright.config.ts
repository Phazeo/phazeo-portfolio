import { defineConfig } from "@playwright/test";

const CI = Boolean(process.env["CI"]);
const SITE_PORT = Number(process.env["PW_SITE_PORT"] ?? 4173);
const DEMO_PORT = Number(process.env["PW_DEMO_PORT"] ?? 5174);
const chromePath = process.env["PW_CHROME_PATH"] || process.env["CHROME_PATH"];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  globalTimeout: 5 * 60_000,
  use: {
    channel: "chrome",
    ...(chromePath ? { executablePath: chromePath } : {}),
    trace: { mode: "on-first-retry", screenshots: false, snapshots: true },
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "site",
      testMatch: "site.spec.ts",
      use: { baseURL: `http://127.0.0.1:${SITE_PORT}` },
    },
    {
      name: "demo",
      testMatch: "directory.spec.ts",
      use: { baseURL: `http://127.0.0.1:${DEMO_PORT}` },
    },
  ],
  webServer: [
    {
      command: `node tools/lib/static-server.ts --port ${SITE_PORT}`,
      url: `http://127.0.0.1:${SITE_PORT}/`,
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
    {
      command: `pnpm exec vite --host 127.0.0.1 --port ${DEMO_PORT}`,
      url: `http://127.0.0.1:${DEMO_PORT}/`,
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_DIRECTORY_DEMO: "45",
      },
    },
  ],
});
