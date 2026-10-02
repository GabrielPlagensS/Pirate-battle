import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;
const URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],
  use: { baseURL: URL, trace: "retain-on-failure" },
  // baseURL e webServer precisam apontar para a MESMA porta.
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: URL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
