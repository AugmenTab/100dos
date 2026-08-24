import {
  expect,
  type ConsoleMessage,
  type Request,
  type Response,
} from "@playwright/test";
import { test as base } from "./session.js";

export { expect };

type ConsoleRecord = { type: string; text: string };

/**
 * Fails the test on uncaught page errors, 100DOS-originated console errors,
 * or failed requests for /systems/100dos/ assets. Other console output is
 * recorded as a report attachment rather than failing the test, since
 * Foundry core and third-party modules can log unrelated noise.
 *
 * foundryPage is worker-scoped and outlives any single test, so listeners
 * are removed at the end of each test rather than left to accumulate on a
 * page shared across the rest of the worker's tests.
 */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ foundryPage: page }, use, testInfo) => {
      const consoleErrors: ConsoleRecord[] = [];
      const pageErrors: string[] = [];
      const failedSystemRequests: string[] = [];

      const onConsole = (msg: ConsoleMessage): void => {
        if (msg.type() === "error")
          consoleErrors.push({ type: msg.type(), text: msg.text() });
      };
      const onPageError = (err: Error): void => {
        pageErrors.push(err.message);
      };
      const onRequestFailed = (request: Request): void => {
        if (request.url().includes("/systems/100dos/")) {
          failedSystemRequests.push(
            `${request.url()} :: ${request.failure()?.errorText ?? "unknown failure"}`,
          );
        }
      };
      const onResponse = (response: Response): void => {
        if (
          response.url().includes("/systems/100dos/") &&
          response.status() >= 400
        ) {
          failedSystemRequests.push(
            `${response.url()} :: HTTP ${response.status()}`,
          );
        }
      };

      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      page.on("requestfailed", onRequestFailed);
      page.on("response", onResponse);

      await use();

      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);

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
