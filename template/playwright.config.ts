import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddProject } from "playwright-bdd";
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing the ${name} env config! fix your .env or secrets`);
  return value;
}

/*
 * One Playwright project per device target (a workaround for playwright-bdd's
 * single-device config). Add any Playwright device here.
 *
 * Each project only runs scenarios tagged with its name: `@desktop` scenarios run
 * in the desktop project, `@mobile` in mobile, and both tags run in both. A
 * scenario with neither tag runs nowhere.
 */
const targets = [
  {
    name: "desktop",
    device: "Desktop Chrome",
    // Slowed down for watching runs locally; full speed in CI.
    use: { launchOptions: { slowMo: process.env.CI ? 0 : 1500 } },
  },
  { name: "mobile", device: "Pixel 7" },
];

export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? parseInt(process.env.WORKERS ?? "1", 10) : 2,
  timeout: 30_000,
  reporter: [
    ["html", { open: "never", outputFolder: "test-artifacts/playwright-report" }],
    ["json", { outputFile: "test-artifacts/playwright-report.json" }],
    cucumberReporter("html", {
      outputFile: "test-artifacts/cucumber-report.html",
    }),
  ],
  use: {
    baseURL: required("TARGET_URL"),
    actionTimeout: 30_000,
    trace: "on",
    screenshot: "only-on-failure",
  },
  projects: [
    ...targets.map(({ name, device, use }) => ({
      ...defineBddProject({
        name,
        features: "tests/features/**/*.feature",
        steps: ["tests/baseTest.ts", "tests/steps/**/*.steps.ts"],
        aiFix: { promptAttachment: true },
        missingSteps: "fail-on-gen",
        tags: `@${name}`,
      }),
      use: { ...devices[device], ...(use ?? {}) },
    })),
  ],
});
