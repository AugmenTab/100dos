// Context shape mirrors PcActorSheet._prepareContext()'s XP/Finances
// ledger output (actors/pc/record/xp.hbs, actors/pc/record/finances.hbs).
// recordedByName is a precomputed field (resolving a recorder ID to a
// name, or "Unknown" when unresolved) — that resolution is a private
// context-preparation computation, not template logic (confirmed: the
// template reads `this.recordedByName` directly, no fallback logic of its
// own), so tests that specifically verify the fallback stayed real-Foundry.
// Rows here just need a plausible value, never asserted on by content.
export type Contribution = { label: string; value: number };
export type LedgerRowFixture = {
  type: string;
  description: string;
  value: number;
  worldTime?: number | null;
  recordedByName?: string;
};

export function buildLedgerRow(row: LedgerRowFixture): Required<LedgerRowFixture> {
  return {
    worldTime: 0,
    recordedByName: "Unknown",
    ...row,
  };
}

export function buildXpContext(overrides: {
  xp?: { earned: number; spent: number; available: number; tier: number };
  xpLedger?: LedgerRowFixture[];
} = {}) {
  return {
    sheetId: "browser-tier-sheet",
    tabs: { record: { xp: { active: true } } },
    actor: { system: { xp: overrides.xp ?? { earned: 0, spent: 0, available: 0, tier: 0 } } },
    xpLedger: (overrides.xpLedger ?? []).map(buildLedgerRow),
  };
}

export function buildFinancesContext(overrides: {
  finances?: { received: number; spent: number; available: number };
  financesLedger?: LedgerRowFixture[];
} = {}) {
  return {
    sheetId: "browser-tier-sheet",
    tabs: { record: { finances: { active: true } } },
    actor: { system: { finances: overrides.finances ?? { received: 0, spent: 0, available: 0 } } },
    financesLedger: (overrides.financesLedger ?? []).map(buildLedgerRow),
  };
}
