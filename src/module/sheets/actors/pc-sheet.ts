import { Dos100ActorSheet } from "../actor-sheet.js";

const PRIMARY_TABS: ApplicationTabConfig[] = [
  { id: "dashboard", label: "DOS100.pc.nav.primary.dashboard" },
  { id: "record", label: "DOS100.pc.nav.primary.record" },
  { id: "combat", label: "DOS100.pc.nav.primary.combat" },
  { id: "medical", label: "DOS100.pc.nav.primary.medical" },
  { id: "inventory", label: "DOS100.pc.nav.primary.inventory" },
  { id: "features", label: "DOS100.pc.nav.primary.features" },
  { id: "skills", label: "DOS100.pc.nav.primary.skills" },
  { id: "spells", label: "DOS100.pc.nav.primary.spells" },
  { id: "effects", label: "DOS100.pc.nav.primary.effects" },
  { id: "settings", label: "DOS100.pc.nav.primary.settings" },
];

const RECORD_TABS: ApplicationTabConfig[] = [
  { id: "basics", label: "DOS100.pc.nav.record.basics" },
  { id: "xp", label: "DOS100.pc.nav.record.xp" },
  { id: "finances", label: "DOS100.pc.nav.record.finances" },
  { id: "biography", label: "DOS100.pc.nav.record.biography" },
];

export class PcActorSheet extends Dos100ActorSheet {
  static override PARTS = {
    body: { template: "systems/100dos/templates/actors/pc.hbs" },
  };

  // `spellSources` has no tabs yet. It is an extension point for a future
  // dynamic secondary group (one tab per spell grant source), populated
  // later by overriding `_getTabsConfig` for that group. No tabs or content
  // exist for it in this milestone.
  static override TABS = {
    primary: { initial: "dashboard", tabs: PRIMARY_TABS },
    record: { initial: "basics", tabs: RECORD_TABS },
    spellSources: { tabs: [] },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...(await super._prepareContext(options)),
      sheetId: this.id,
      tabs: {
        primary: this._prepareTabs("primary"),
        record: this._prepareTabs("record"),
      },
    };
  }

  // The core tab-click handler toggles the "active" CSS class on tab
  // controls and panels directly, without a full re-render, but it only
  // maintains `aria-pressed` on <button> elements rather than the
  // `aria-selected`/`tabindex` pair the tab pattern needs. Keep relying on
  // the core mechanism for state and DOM updates, and layer the missing
  // accessibility bookkeeping on top of it.
  override _onClickTab(event: PointerEvent): void {
    super._onClickTab(event);
    const group = (event.target as HTMLElement).dataset.group;
    if (group) this.syncTabAccessibility(group);
  }

  override async _onFirstRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void> {
    await super._onFirstRender(context, options);
    this.element.addEventListener("keydown", (event) => this.onTabListKeyDown(event));
  }

  private syncTabAccessibility(group: string): void {
    const controls = Array.from(this.element.querySelectorAll<HTMLElement>(`[role="tab"][data-group="${group}"]`));
    for (const control of controls) {
      const active = control.classList.contains("active");
      control.setAttribute("aria-selected", String(active));
      control.tabIndex = active ? 0 : -1;
    }
  }

  // The core tab action only handles activation clicks; it does not provide
  // the Arrow/Home/End roving-focus behavior the tab pattern expects, so
  // that gap is filled here. Activation itself needs no separate handling:
  // Enter/Space on a focused <button> already dispatches a native click,
  // which the existing "tab" action handler picks up.
  private onTabListKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const control = target?.closest<HTMLElement>('[role="tab"]');
    if (!control) return;
    const tabList = control.closest<HTMLElement>('[role="tablist"]');
    if (!tabList) return;

    const controls = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]'));
    const index = controls.indexOf(control);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = controls[(index + 1) % controls.length];
        break;
      case "ArrowLeft":
        next = controls[(index - 1 + controls.length) % controls.length];
        break;
      case "Home":
        next = controls[0];
        break;
      case "End":
        next = controls[controls.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  }
}
