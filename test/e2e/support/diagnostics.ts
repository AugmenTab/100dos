import { test as base, expect } from "@playwright/test";

export { expect };

type ConsoleRecord = { type: string; text: string };

/**
 * Fails the test on uncaught page errors, 100DOS-originated console errors,
 * or failed requests for /systems/100dos/ assets. Other console output is
 * recorded as a report attachment rather than failing the test, since
 * Foundry core and third-party modules can log unrelated noise.
 */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: ConsoleRecord[] = [];
      const pageErrors: string[] = [];
      const failedSystemRequests: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error")
          consoleErrors.push({ type: msg.type(), text: msg.text() });
      });
      page.on("pageerror", (err) => {
        pageErrors.push(err.message);
      });
      page.on("requestfailed", (request) => {
        if (request.url().includes("/systems/100dos/")) {
          failedSystemRequests.push(
            `${request.url()} :: ${request.failure()?.errorText ?? "unknown failure"}`,
          );
        }
      });
      page.on("response", (response) => {
        if (
          response.url().includes("/systems/100dos/") &&
          response.status() >= 400
        ) {
          failedSystemRequests.push(
            `${response.url()} :: HTTP ${response.status()}`,
          );
        }
      });

      await use();

      if (consoleErrors.length) {
        await testInfo.attach("console-errors.json", {
          body: JSON.stringify(consoleErrors, null, 2),
          contentType: "application/json",
        });
      }

      const systemConsoleErrors = consoleErrors.filter((e) =>
        /100DOS/i.test(e.text),
      );

      expect(
        pageErrors,
        `Uncaught page errors:\n${pageErrors.join("\n")}`,
      ).toHaveLength(0);
      expect(
        systemConsoleErrors,
        `100DOS console errors:\n${systemConsoleErrors.map((e) => e.text).join("\n")}`,
      ).toHaveLength(0);
      expect(
        failedSystemRequests,
        `Failed 100dos system asset requests:\n${failedSystemRequests.join("\n")}`,
      ).toHaveLength(0);
    },
    { auto: true },
  ],
});
