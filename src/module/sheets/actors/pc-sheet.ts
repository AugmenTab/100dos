import { Dos100ActorSheet } from "../actor-sheet.js";
import { Dos100Item } from "../../documents/item.js";
import { type ActorMovement, type MovementMode } from "../../movement.js";
import { type MythicCharacteristics } from "../../mythic-characteristic.js";
import {
  DR_LOCATION_TYPES,
  type DamageResistanceLocation,
  type DamageResistanceLocationType,
  type DamageResistanceLocations,
  sortLocationsForDisplay,
} from "../../damage-resistance.js";

type DrCategory = {
  type: DamageResistanceLocationType;
  locations: (DamageResistanceLocation & { key: string })[];
};

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
  { id: "notes", label: "DOS100.pc.nav.record.notes" },
];

export class PcActorSheet extends Dos100ActorSheet {
  static override PARTS = {
    body: { template: "systems/100dos/templates/actors/pc.hbs" },
  };

  static override DEFAULT_OPTIONS = {
    actions: {
      useQuickItem: PcActorSheet.prototype.onUseQuickItem,
    },
  };

  // `spellSources` has no tabs yet. It is an extension point for a future
  // dynamic secondary group (one tab per spell grant source), populated
  // later by overriding `_getTabsConfig` for that group. No tabs or content
  // exist for it yet.
  static override TABS = {
    primary: { initial: "dashboard", tabs: PRIMARY_TABS },
    record: { initial: "basics", tabs: RECORD_TABS },
    spellSources: { tabs: [] },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const movementModeOptions = this.movementModeOptions();
    return {
      ...(await super._prepareContext(options)),
      sheetId: this.id,
      tabs: {
        primary: this._prepareTabs("primary"),
        record: this._prepareTabs("record"),
      },
      // Available choices for the Archetype selector. Render context, not
      // persisted data: derived fresh from owned Items on every render.
      // TODO: the Archetype Item type doesn't exist yet, so this is always
      // empty for now — the selector's data flow (options in, system.archetype
      // out) is still correct and needs no rework once that Item type arrives.
      archetypeOptions: this.actor.items
        .filter((item) => item.type === "archetype")
        .map((item) => ({ value: item.uuid, label: item.name })),
      // TODO: always null until the Archetype Item type exists — nothing can
      // ever resolve archetypeOptions/system.archetype to a real Item yet.
      selectedArchetype:
        this.actor.items.filter(
          (item) => item.uuid === (this.actor.system as { archetype?: string | null }).archetype,
        )[0] ?? null,
      // TODO: only the Ability Item type carries `pinned` so far. Other
      // Action-bearing Item types (e.g. Weapons) should be added to this
      // filter once they adopt the same field.
      quickUseItems: this.actor.items.filter(
        (item) => item.type === "ability" && (item.system as { pinned?: boolean }).pinned === true,
      ),
      // TODO: neither the Skill nor Education Item type exists yet, so this
      // is always empty for now — filtering on system.pinned is otherwise
      // already correct for whenever those Item types arrive.
      pinnedSkills: this.actor.items.filter(
        (item) =>
          (item.type === "skill" || item.type === "education") &&
          (item.system as { pinned?: boolean }).pinned === true,
      ),
      activeEffects: this.actor.items.filter(
        (item) => item.type === "effect" && (item.system as { active?: boolean }).active === true,
      ),
      // Render context, not persisted data: which movement modes this Actor
      // currently has available. "land" (system.movement.base) is always
      // available; the alternate modes are only offered when their schema
      // field is populated rather than null.
      movementModeOptions,
      hasAlternateMovementModes: movementModeOptions.length > 1,
      hasMythicCharacteristics: this.hasMythicCharacteristics(),
      drCategories: this.drCategories(),
    };
  }

  // Render context, not persisted data: system.dr is a keyed collection of
  // arbitrary locations (see damage-resistance.ts), not one fixed field per
  // humanoid location. Grouped by category in the Dashboard's fixed
  // presentation order (head/torso/arm/leg/wing/tail), each category's
  // locations sorted for display; a category with zero locations is
  // omitted entirely rather than rendered as an empty cell.
  private drCategories(): DrCategory[] {
    const dr = (this.actor.system as { dr: DamageResistanceLocations }).dr;
    const entries = Object.entries(dr).map(([key, location]) => ({ key, ...location }));
    const categories: DrCategory[] = [];
    for (const type of DR_LOCATION_TYPES) {
      const locations = sortLocationsForDisplay(entries.filter((location) => location.type === type));
      if (locations.length > 0) categories.push({ type, locations });
    }
    return categories;
  }

  // Render context, not persisted data: whether the Mythic Characteristics
  // table should be shown at all. system.mythicCharacteristics is nullable
  // (no Mythic Awakening yet); even once populated, a PC could still have all
  // three at 0, which should read the same as not having the table.
  private hasMythicCharacteristics(): boolean {
    const mythic = (this.actor.system as { mythicCharacteristics: MythicCharacteristics | null })
      .mythicCharacteristics;
    if (mythic === null) return false;
    return mythic.str.value > 0 || mythic.tou.value > 0 || mythic.agi.value > 0;
  }

  private movementModeOptions(): { value: MovementMode; label: string }[] {
    const movement = (this.actor.system as { movement: ActorMovement }).movement;
    const modes: MovementMode[] = ["land"];
    if (movement.climb !== null) modes.push("climb");
    if (movement.swim !== null) modes.push("swim");
    if (movement.fly !== null) modes.push("fly");
    if (movement.burrow !== null) modes.push("burrow");
    return modes.map((mode) => ({ value: mode, label: game.i18n.localize(`DOS100.movement.modes.${mode}`) }));
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

  // TODO: only single-Action Items are wired up so far; the first (only)
  // action id is used directly. Multi-Action selection is a future workflow.
  private async onUseQuickItem(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;
    const actions = (item.system as { actions?: { items: Record<string, unknown> } }).actions;
    const actionId = actions ? Object.keys(actions.items)[0] : undefined;
    if (!actionId) return;
    await (item as Dos100Item).useAction(actionId);
  }
}
