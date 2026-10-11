import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddProject } from "playwright-bdd";
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing the ${name} env config! fix your .env or secrets`);
  return value;
}

/*
 *workaround pattern for multiple devices... limitation of playwright-bdd config logic.
 *you can add more or less devices from any of Playwrights options here and pass as a flag
 */
const targets = [
  {
    name: "desktop",
    device: "Desktop Chrome",
    use: { launchOptions: { slowMo: 1500 } },
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
      }),
      use: { ...devices[device], ...(use ?? {}) },
    })),
  ],
});
