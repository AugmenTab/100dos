/**
 * Standalone readiness poll for the dedicated foundry-test HTTP endpoint.
 * Run inside the e2e container: node test/e2e/support/wait-for-ready.ts <url>
 * Exits 0 once the endpoint responds, non-zero if the timeout elapses first.
 */
const url =
  process.argv[2] ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://foundry-test:30000";
const timeoutMs = Number(process.env.READY_TIMEOUT_MS ?? 120_000);
const intervalMs = 1_000;

async function isResponsive(): Promise<boolean> {
  try {
    // Any completed HTTP round trip (redirect, error page, etc.) means the
    // server is up; only a connection failure means it isn't ready yet.
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(`Waiting for ${url} to respond...\n`);

  while (Date.now() < deadline) {
    if (await isResponsive()) {
      process.stdout.write(`${url} is responsive.\n`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${url} to respond.`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
