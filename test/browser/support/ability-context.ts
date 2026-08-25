// Context shape mirrors AbstractItemSheet._prepareContext() (see
// src/module/sheets/items/abstract-item-sheet.ts) closely enough to render
// items/ability.hbs faithfully: item/sheetId/itemTypeLabel are passed
// straight through by the real method; tabs.primary is Foundry's own
// _prepareTabs() output shape (id/label/active/cssClass per tab), hand-built
// here rather than computed — that computation is ApplicationV2 machinery,
// out of scope for this tier, so its RESULT shape is reproduced instead.
export type AbilityItemFixture = {
  img?: string;
  name?: string;
  system?: {
    active?: boolean;
    actions?: { pinned?: boolean };
    showInCombatTab?: boolean;
    tags?: string[];
    description?: string;
    changes?: {
      computed?: { id: string; target: string; mode: string; formula: string }[];
      conditional?: { id: string; target: string; value: string }[];
    };
  };
};

export function buildAbilityContext(item: AbilityItemFixture, activeTab: "description" | "details" | "changes" = "description") {
  const tabDefs = [
    { id: "description", label: "DOS100.item.tabs.description" },
    { id: "details", label: "DOS100.item.tabs.details" },
    { id: "changes", label: "DOS100.item.tabs.changes" },
  ] as const;
  const tabs: Record<string, { id: string; label: string; active: boolean; cssClass: string }> = {};
  for (const def of tabDefs) {
    const active = def.id === activeTab;
    tabs[def.id] = { ...def, active, cssClass: active ? "active" : "" };
  }
  return {
    item: {
      img: item.img ?? "systems/100dos/assets/icons/ability.svg",
      name: item.name ?? "[Browser] Ability",
      type: "ability",
      system: {
        active: item.system?.active ?? true,
        actions: { pinned: item.system?.actions?.pinned ?? false },
        showInCombatTab: item.system?.showInCombatTab ?? false,
        tags: item.system?.tags ?? [],
        description: item.system?.description ?? "",
        changes: {
          computed: item.system?.changes?.computed ?? [],
          conditional: item.system?.changes?.conditional ?? [],
        },
      },
    },
    sheetId: "browser-tier-sheet",
    tabs: { primary: tabs },
    itemTypeLabel: "Ability",
  };
}
