// Context shape mirrors PcActorSheet._prepareContext()'s Inventory output
// (actors/pc/inventory.hbs) closely enough for the 4 portable Inventory
// tests. armorItems/gearItems/ammunitionItems are deliberately left empty
// — the one test that populates real Item rows ("Armor rows render
// Carried/Equipped toggles...") is Foundry-owned (data-action dispatch)
// and stays real-Foundry; every migrated test only exercises the
// item-type-less empty-wireframe partials, which render correctly with no
// rows at all.
export type EncumbranceBand = { labelKey: string; thresholdValue: number; fillPercent: number };
export type Contribution = { label: string; value: number };

function zeroThreshold(): { value: number; contributions: Contribution[] } {
  return { value: 0, contributions: [] };
}

export function buildInventoryContext(overrides: {
  encumbrance?: { carried: number; felt: number; total: number };
  encumbranceBands?: EncumbranceBand[];
  financesCarried?: number;
  thresholds?: { carry?: number; lift?: number; push?: number };
} = {}) {
  return {
    sheetId: "browser-tier-sheet",
    tabs: { primary: { inventory: { active: true } } },
    actor: {
      system: {
        encumbrance: {
          carried: overrides.encumbrance?.carried ?? 0,
          felt: overrides.encumbrance?.felt ?? 0,
          total: overrides.encumbrance?.total ?? 0,
          thresholds: {
            base: {
              carry: overrides.thresholds?.carry !== undefined ? { value: overrides.thresholds.carry, contributions: [{ label: "Base", value: overrides.thresholds.carry }] } : zeroThreshold(),
              lift: overrides.thresholds?.lift !== undefined ? { value: overrides.thresholds.lift, contributions: [{ label: "Base", value: overrides.thresholds.lift }] } : zeroThreshold(),
              push: overrides.thresholds?.push !== undefined ? { value: overrides.thresholds.push, contributions: [] } : zeroThreshold(),
            },
          },
        },
        finances: { carried: overrides.financesCarried ?? 0 },
      },
    },
    encumbranceBands: overrides.encumbranceBands ?? [],
    armorItems: [],
    gearItems: [],
    ammunitionItems: [],
  };
}
