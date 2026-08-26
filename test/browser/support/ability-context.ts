// Context shape mirrors AbstractItemSheet._prepareContext() (see
// src/module/sheets/items/abstract-item-sheet.ts) closely enough to render
// items/shell/item-shell.hbs faithfully: item/sheetId/itemTypeLabel are passed
// straight through by the real method; tabs.primary/links are Foundry's own
// _prepareTabs() output shape (id/label/active/cssClass per tab), hand-built
// here rather than computed — that computation is ApplicationV2 machinery,
// out of scope for this tier, so its RESULT shape is reproduced instead.
export type LinkedItemFixture = { id: string; name: string; img: string };

export type ActionItemFixture = {
  id: string;
  name: string;
  uses: { per: string; value: number; max: number };
};

export type AbilityItemFixture = {
  img?: string;
  name?: string;
  system?: {
    active?: boolean;
    actions?: {
      pinned?: boolean;
      items?: Record<string, ActionItemFixture>;
      uses?: { per: string; value: number; max: number; formula: { max: string } };
      notes?: { effectNotes?: string[]; footnotes?: string[] };
    };
    showInCombatTab?: boolean;
    tags?: string[];
    identifier?: string;
    description?: string;
    changes?: {
      computed?: { id: string; target: string; mode: string; formula: string }[];
      conditional?: { id: string; target: string; value: string }[];
    };
  };
  childItems?: LinkedItemFixture[];
  supplementItems?: LinkedItemFixture[];
};

export function buildAbilityContext(
  item: AbilityItemFixture,
  activeTab: "description" | "details" | "changes" | "links" = "description",
  activeLinksTab: "children" | "supplements" = "children",
) {
  const primaryTabDefs = [
    { id: "description", label: "DOS100.item.tabs.description" },
    { id: "details", label: "DOS100.item.tabs.details" },
    { id: "changes", label: "DOS100.item.tabs.changes" },
    { id: "links", label: "DOS100.item.tabs.links" },
  ] as const;
  const primaryTabs: Record<string, { id: string; label: string; active: boolean; cssClass: string }> = {};
  for (const def of primaryTabDefs) {
    const active = def.id === activeTab;
    primaryTabs[def.id] = { ...def, active, cssClass: active ? "active" : "" };
  }

  const linksTabDefs = [
    { id: "children", label: "DOS100.item.links.children.label" },
    { id: "supplements", label: "DOS100.item.links.supplements.label" },
  ] as const;
  const linksTabs: Record<string, { id: string; label: string; active: boolean; cssClass: string }> = {};
  for (const def of linksTabDefs) {
    const active = def.id === activeLinksTab;
    linksTabs[def.id] = { ...def, active, cssClass: active ? "active" : "" };
  }

  return {
    item: {
      img: item.img ?? "systems/100dos/assets/icons/ability.svg",
      name: item.name ?? "[Browser] Ability",
      type: "ability",
      system: {
        active: item.system?.active ?? true,
        actions: {
          pinned: item.system?.actions?.pinned ?? false,
          items: item.system?.actions?.items ?? {},
          uses: item.system?.actions?.uses ?? { per: "unlimited", value: 0, max: 0, formula: { max: "" } },
          notes: {
            effectNotes: item.system?.actions?.notes?.effectNotes ?? [],
            footnotes: item.system?.actions?.notes?.footnotes ?? [],
          },
        },
        showInCombatTab: item.system?.showInCombatTab ?? false,
        tags: item.system?.tags ?? [],
        identifier: item.system?.identifier ?? "",
        description: item.system?.description ?? "",
        changes: {
          computed: item.system?.changes?.computed ?? [],
          conditional: item.system?.changes?.conditional ?? [],
        },
      },
    },
    sheetId: "browser-tier-sheet",
    tabs: { primary: primaryTabs, links: linksTabs },
    itemTypeLabel: "Ability",
    showCombatTab: true,
    grantSource: null,
    usagePeriods: {
      unlimited: "DOS100.action.uses.periods.unlimited",
      encounter: "DOS100.action.uses.periods.encounter",
      day: "DOS100.action.uses.periods.day",
      minute: "DOS100.action.uses.periods.minute",
      hour: "DOS100.action.uses.periods.hour",
      charges: "DOS100.action.uses.periods.charges",
    },
    childItems: item.childItems ?? [],
    supplementItems: item.supplementItems ?? [],
  };
}
