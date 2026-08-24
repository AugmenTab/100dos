import { type Page } from "@playwright/test";

/**
 * One dedicated GM-role Foundry User per intended concurrent Playwright
 * worker lane. Provisioned at at most this count; raise it before raising
 * playwright.config.ts's worker count above it.
 */
export const E2E_GM_USER_COUNT = 4;

export function e2eGmUserLabel(lane: number): string {
  return `[E2E] Gamemaster ${lane}`;
}

/**
 * Idempotently ensures one dedicated GM-role User per lane exists in the
 * dedicated test world. Concurrent Playwright workers each join as their
 * own User (see support/session.ts) instead of sharing one authenticated
 * session — joining as the same User from multiple concurrent connections
 * collides on that User's session slot on the /join screen.
 *
 * Must be called once, from an already-authenticated GM session (global
 * setup's bootstrap join as the world's original "Gamemaster" user), before
 * any worker attempts its own join. A full GM can freely create/update
 * other Users, including their password (see common/documents/user.mjs's
 * #canUpdate — the password-restriction only applies to non-GM callers).
 */
export async function ensureE2eGmUsers(page: Page): Promise<void> {
  const password = process.env.FOUNDRY_E2E_GM_PASSWORD ?? "";
  const labels = Array.from({ length: E2E_GM_USER_COUNT }, (_, lane) => e2eGmUserLabel(lane));

  await page.evaluate(
    async ({ labels, password }) => {
      const existing = new Set(game.users.map((u) => u.name));
      const missing = labels.filter((label) => !existing.has(label));
      if (missing.length === 0) return;

      await User.create(
        missing.map((name) => ({
          name,
          role: CONST.USER_ROLES.GAMEMASTER,
          password,
        })),
      );
    },
    { labels, password },
  );
}
