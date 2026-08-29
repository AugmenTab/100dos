// Context shape mirrors ActionSheet._prepareContext() closely enough to
// render items/action/action-shell.hbs faithfully. Tab computation is
// ApplicationV2 machinery out of scope for this tier — its result shape
// is reproduced directly instead.
export type ActionFixture = {
  img?: string;
  name?: string;
};

const TAB_DEFS = [
  { id: "description", label: "DOS100.item.actionSheet.tabs.description" },
  { id: "usage", label: "DOS100.item.actionSheet.tabs.usage" },
  { id: "action", label: "DOS100.item.actionSheet.tabs.action" },
  { id: "miscellaneous", label: "DOS100.item.actionSheet.tabs.miscellaneous" },
] as const;

export function buildActionContext(
  action: ActionFixture = {},
  activeTab: "description" | "usage" | "action" | "miscellaneous" = "description",
) {
  const primaryTabs: Record<string, { id: string; label: string; active: boolean; cssClass: string }> = {};
  for (const def of TAB_DEFS) {
    const active = def.id === activeTab;
    primaryTabs[def.id] = { ...def, active, cssClass: active ? "active" : "" };
  }

  return {
    action: {
      img: action.img ?? "icons/svg/item-bag.svg",
      name: action.name ?? "[Browser] Action",
    },
    sheetId: "browser-tier-action-sheet",
    tabs: { primary: primaryTabs },
  };
}
