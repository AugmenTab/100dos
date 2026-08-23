import { Dos100ActorSheet } from "../actor-sheet.js";
import { Dos100Item, ACTIONS_ITEM_TYPES } from "../../documents/item.js";
import { type ActorMovement, type MovementMode } from "../../movement.js";
import { type Encumbrance, type EncumbranceBand, encumbranceBands } from "../../encumbrance.js";
import { type MythicCharacteristics } from "../../mythic-characteristic.js";
import {
  DR_LOCATION_TYPES,
  type DamageResistanceLocation,
  type DamageResistanceLocationType,
  type DamageResistanceLocations,
  sortLocationsForDisplay,
} from "../../damage-resistance.js";
import { type ExperienceLedger, type ExperienceLedgerItem } from "../../xp.js";
import { type Finances, type FinanceLedgerItem } from "../../finances.js";
import { type ActorSkill, type ActorSkills, type SkillTraining, SKILL_TRAININGS } from "../../skill.js";
import { type CharacteristicId, isCharacteristicId } from "../../characteristic.js";
import {
  type ActorEducation,
  type ActorEducations,
  type EducationTarget,
  type EducationTraining,
  EDUCATION_TRAININGS,
} from "../../education.js";
import { type Actions } from "../../items/action.js";
import { type EffectData } from "../../items/effect.js";
import { type StatusId, STATUS_IDS } from "../../status.js";

declare global {
  interface Game {
    users: { get(id: string): { name: string } | undefined };
  }
}

type DrCategory = {
  type: DamageResistanceLocationType;
  locations: (DamageResistanceLocation & { key: string })[];
};

type XpLedgerRow = ExperienceLedgerItem & {
  recordedByName: string;
  realTimeDisplay: string;
};

type FinanceLedgerRow = FinanceLedgerItem & {
  recordedByName: string;
  realTimeDisplay: string;
};

type SkillRow = ActorSkill & {
  tag: string;
  characteristicOptions: { value: CharacteristicId; label: string }[];
};

type EducationRow = ActorEducation & {
  tag: string;
  targetOptions: { value: EducationTarget; label: string }[];
};

// One Status palette button — one per STATUS_IDS entry, in that fixed
// order. img comes from CONFIG.statusEffects (see status.ts) so the
// palette and the Token HUD always agree on artwork.
type StatusButtonRow = {
  id: StatusId;
  label: string;
  img: string;
  active: boolean;
};

// One row in any Actions-bearing Item table — Effects' Linked/Permanent/
// Temporary tables, the Dashboard's Active Effect Items list, and
// Features' Templates/Abilities/Traits/Miscellaneous tables all share
// this shape. TODO: the Actions column is a single inert rollable icon,
// not a per-Action button list — nothing to resolve yet, so there's
// nothing to identify a specific Action by. uses is null unless the Item
// has Actions AND a non-unlimited shared Uses pool. Left as {value, max}
// rather than a pre-formatted string so the template can format both
// through localizeNumber, matching every other numeric display (Skills,
// Educations, ledgers).
type ItemActionsRow = {
  item: Dos100Item;
  hasActions: boolean;
  uses: { value: number; max: number } | null;
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
      togglePinnedSkill: PcActorSheet.prototype.onTogglePinnedSkill,
      toggleStatus: PcActorSheet.prototype.onToggleStatus,
      toggleItemPinned: PcActorSheet.prototype.onToggleItemPinned,
      toggleEffectActive: PcActorSheet.prototype.onToggleEffectActive,
      toggleItemCarried: PcActorSheet.prototype.onToggleItemCarried,
      toggleItemEquipped: PcActorSheet.prototype.onToggleItemEquipped,
      editItem: PcActorSheet.prototype.onEditItem,
      duplicateItem: PcActorSheet.prototype.onDuplicateItem,
      deleteItem: PcActorSheet.prototype.onDeleteItem,
      createEffect: PcActorSheet.prototype.onCreateEffect,
    },
  };

  // TODO: `spellSources` has no tabs yet. It is an extension point for a
  // future dynamic secondary group (one tab per spell grant source),
  // populated later by overriding `_getTabsConfig` for that group. No tabs
  // or content exist for it yet.
  static override TABS = {
    primary: { initial: "dashboard", tabs: PRIMARY_TABS },
    record: { initial: "basics", tabs: RECORD_TABS },
    spellSources: { tabs: [] },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const movementModeOptions = this.movementModeOptions();
    const pinnedSkills = this.pinnedSkills();
    const pinnedEducations = this.pinnedEducations();
    return {
      ...(await super._prepareContext(options)),
      sheetId: this.id,
      tabs: {
        primary: this._prepareTabs("primary"),
        record: this._prepareTabs("record"),
      },
      hasSpells: this.hasSpells(),
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
      // An Effect's click behavior differs from an ordinary Item's (toggles
      // `active` rather than invoking an Action) — see onUseQuickItem below.
      quickUseItems: this.actor.items.filter(
        (item) =>
          ACTIONS_ITEM_TYPES.has(item.type) &&
          (item.system as { actions?: Actions }).actions?.pinned === true,
      ),
      pinnedSkills,
      pinnedEducations,
      hasNoPinnedSkillsOrEducations: pinnedSkills.length === 0 && pinnedEducations.length === 0,
      statuses: this.statusButtonRows(),
      activeStatuses: this.activeStatusRows(),
      linkedEffects: this.effectRows("linked"),
      permanentEffects: this.effectRows("permanent"),
      temporaryEffects: this.effectRows("temporary"),
      activeEffects: this.actor.items
        .filter((item) => item.type === "effect" && (item.system as EffectData).active === true)
        .map((item) => this.itemActionsRow(item as Dos100Item)),
      // TODO: no Template Item type exists yet — stays empty until one
      // does. The Miscellaneous section is the same: no Item type/source
      // has been implemented for it yet.
      templateItems: [],
      abilityItems: this.itemActionsRows("ability"),
      traitItems: this.itemActionsRows("trait"),
      miscellaneousItems: [],
      // Inventory's Weapons, Equipment, Consumables, Miscellaneous, and
      // Containers sections have no implemented Item type yet, so they
      // stay wireframe-empty (no rows= passed to their partial in
      // inventory.hbs) until one does.
      armorItems: this.itemActionsRows("armor"),
      gearItems: this.itemActionsRows("gear"),
      ammunitionItems: this.inventoryItemRows("ammunition"),
      encumbranceBands: this.encumbranceBands(),
      // Render context, not persisted data: which movement modes this Actor
      // currently has available. "land" (system.movement.base) is always
      // available; the alternate modes are only offered when their schema
      // field is populated rather than null.
      movementModeOptions,
      hasAlternateMovementModes: movementModeOptions.length > 1,
      hasMythicCharacteristics: this.hasMythicCharacteristics(),
      drCategories: this.drCategories(),
      xpLedger: this.xpLedger(),
      financesLedger: this.financesLedger(),
      skillRows: this.skillRows(),
      skillTrainingOptions: this.skillTrainingOptions(),
      educationRows: this.educationRows(),
      educationTrainingOptions: this.educationTrainingOptions(),
    };
  }

  // Render context, not persisted data: each row's stored recordedBy User ID
  // resolves to that User's current display name (never persisting the name
  // itself — a renamed User must not require rewriting every row it
  // recorded), and realTime formats to a display string for the
  // Game Date hover tooltip. worldTime needs no equivalent resolution here —
  // it's rendered directly via the existing localizeNumber helper, the
  // simplest available representation until a calendar system exists.
  private xpLedger(): XpLedgerRow[] {
    const xp = (this.actor.system as { xp: ExperienceLedger }).xp;
    return xp.ledger.map((item) => ({
      ...item,
      recordedByName:
        (item.recordedBy !== null ? game.users.get(item.recordedBy)?.name : undefined) ??
        game.i18n.localize("DOS100.xp.ledger.unknownRecorder"),
      realTimeDisplay: new Date(item.realTime).toLocaleString(game.i18n.lang),
    }));
  }

  // Render context, not persisted data — see xpLedger() above for the same
  // recordedBy/realTime resolution rationale. Finances stays its own
  // standalone concept rather than an alias of the XP ledger, so this is a
  // separate method with the same shape rather than a shared abstraction
  // over two schema types that happen to currently look alike.
  private financesLedger(): FinanceLedgerRow[] {
    const finances = (this.actor.system as { finances: Finances }).finances;
    return finances.ledger.map((item) => ({
      ...item,
      recordedByName:
        (item.recordedBy !== null ? game.users.get(item.recordedBy)?.name : undefined) ??
        game.i18n.localize("DOS100.finances.ledger.unknownRecorder"),
      realTimeDisplay: new Date(item.realTime).toLocaleString(game.i18n.lang),
    }));
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

  // Render context, not persisted data: pinned Actor Skills, alphabetized —
  // rendered as their own stacked cluster in the Dashboard's "Pinned Skills
  // & Educations" section, not merged/interleaved with pinnedEducations()
  // below (see dashboard.hbs). Derived from system.skills (see skill.ts)
  // rather than embedded Items.
  private pinnedSkills(): { tag: string; name: string }[] {
    return Object.entries((this.actor.system as { skills: ActorSkills }).skills)
      .filter(([, skill]) => skill.pinned)
      .map(([tag, skill]) => ({ tag, name: skill.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Render context, not persisted data — see pinnedSkills() above for the
  // same rationale (own alphabetized cluster, not merged with Skills).
  // Derived from system.educations (see education.ts) rather than embedded
  // Items.
  private pinnedEducations(): { tag: string; name: string }[] {
    return Object.entries((this.actor.system as { educations: ActorEducations }).educations)
      .filter(([, education]) => education.pinned)
      .map(([tag, education]) => ({ tag, name: education.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Render context, not persisted data: each row's Characteristic <select>
  // options are built from that Skill's own `characteristics` list only
  // (never all ten), and rows are sorted alphabetically by name — Array#sort
  // is stable, so same-named rows keep their original system.skills
  // iteration order. No persisted ordering exists yet.
  private skillRows(): SkillRow[] {
    const skills = (this.actor.system as { skills: ActorSkills }).skills;
    return Object.entries(skills)
      .map(([tag, skill]) => ({
        ...skill,
        tag,
        characteristicOptions: skill.characteristics.map((id) => ({
          value: id,
          label: game.i18n.localize(`DOS100.characteristic.${id}.abbr`),
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Render context, not persisted data: the fixed Training enum's options
  // are the same for every row, unlike each Skill's own characteristicOptions
  // — computed once here rather than per row.
  private skillTrainingOptions(): { value: SkillTraining; label: string }[] {
    return SKILL_TRAININGS.map((training) => ({
      value: training,
      label: game.i18n.localize(`DOS100.skills.training.${training}`),
    }));
  }

  // Render context, not persisted data: each row's Characteristic/Skill
  // <select> options are built from that Education's own `options` list
  // only, and rows are sorted alphabetically by name — same rationale as
  // skillRows() above. No persisted ordering exists yet.
  private educationRows(): EducationRow[] {
    const educations = (this.actor.system as { educations: ActorEducations }).educations;
    const skills = (this.actor.system as { skills: ActorSkills }).skills;
    return Object.entries(educations)
      .map(([tag, education]) => ({
        ...education,
        tag,
        targetOptions: education.options.map((target) => ({
          value: target,
          label: this.educationTargetLabel(target, skills),
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // A target is either one of the ten reserved Characteristic IDs or a
  // Skill tag (see education.ts) — resolved to a display label here, never
  // persisted. A Skill tag with no matching system.skills entry falls back
  // to the raw tag itself rather than mutating the Education or hiding the
  // option.
  private educationTargetLabel(target: EducationTarget, skills: ActorSkills): string {
    if (isCharacteristicId(target)) return game.i18n.localize(`DOS100.characteristic.${target}.abbr`);
    return skills[target]?.name ?? target;
  }

  // Render context, not persisted data: the fixed Training enum's options
  // are the same for every row — computed once here rather than per row.
  private educationTrainingOptions(): { value: EducationTraining; label: string }[] {
    return EDUCATION_TRAININGS.map((training) => ({
      value: training,
      label: game.i18n.localize(`DOS100.educations.training.${training}`),
    }));
  }

  // The full sheet-facing status palette, in STATUS_IDS order, each
  // flagged active via Actor#statuses — a live Set Foundry derives from
  // this Actor's embedded ActiveEffects. CONFIG.statusEffects (built from
  // the same STATUS_IDS list, see status.ts) is the img source, so the
  // palette and Token HUD never disagree.
  private statusButtonRows(): StatusButtonRow[] {
    return STATUS_IDS.map((id) => ({
      id,
      label: game.i18n.localize(`DOS100.status.${id}`),
      img: CONFIG.statusEffects.find((status) => status.id === id)?.img ?? "",
      active: this.actor.statuses.has(id),
    }));
  }

  // The Dashboard's informational subset of statusButtonRows(): only
  // statuses currently active, for display above the Active Effect Items
  // list. Duration is read from the underlying ActiveEffect, not stored
  // anywhere of our own.
  private activeStatusRows(): {
    id: StatusId;
    label: string;
    img: string;
    duration: { value: number; unit: string } | null;
  }[] {
    return this.statusButtonRows()
      .filter((status) => status.active)
      .map(({ id, label, img }) => ({ id, label, img, duration: this.statusDuration(id) }));
  }

  // Finds the single-status ActiveEffect backing a given status id, the
  // same way Actor#toggleStatusEffect itself locates one to remove (no
  // static _id is assigned to our CONFIG.statusEffects entries, so this
  // matches on `statuses` containing exactly that one id). units comes
  // back singularized ("rounds" -> "round") to reuse the same
  // DOS100.effect.duration.abbr keys as our own Effect Item duration.
  private statusDuration(id: StatusId): { value: number; unit: string } | null {
    const effect = Array.from(this.actor.effects).find(
      (effect) => effect.statuses.size === 1 && effect.statuses.has(id),
    );
    if (!effect || !Number.isFinite(effect.duration.value)) return null;
    return { value: effect.duration.value as number, unit: effect.duration.units.replace(/s$/, "") };
  }

  // An Effect Item's lifecycle group — derived, never a stored category
  // field. Linked takes precedence over deleteOnExpire, using the existing
  // grant/source relationship (Dos100Item#grantingItem) rather than a new
  // field.
  private effectGroup(item: Dos100Item): "linked" | "permanent" | "temporary" {
    if (item.grantingItem !== null) return "linked";
    return (item.system as EffectData).deleteOnExpire ? "temporary" : "permanent";
  }

  // Effect Items in the given lifecycle group, alphabetized — same sorting
  // rationale as skillRows()/educationRows() above.
  private effectRows(group: "linked" | "permanent" | "temporary"): ItemActionsRow[] {
    return this.actor.items
      .filter((item) => item.type === "effect")
      .map((item) => item as Dos100Item)
      .filter((item) => this.effectGroup(item) === group)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => this.itemActionsRow(item));
  }

  // Owned Items of the given type, alphabetized — shared by every page that
  // groups owned Items into per-type tables (Features, Inventory).
  private itemsOfType(type: string): Dos100Item[] {
    return this.actor.items
      .filter((item) => item.type === type)
      .map((item) => item as Dos100Item)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Alphabetized rows for an Actions-bearing Item type — the Features
  // page's Ability/Trait tables, and Inventory's Armor/Gear tables.
  // Templates and Miscellaneous (Features) have no implemented Item
  // type/source yet, so their sections stay wireframe-empty until one does.
  private itemActionsRows(type: string): ItemActionsRow[] {
    return this.itemsOfType(type).map((item) => this.itemActionsRow(item));
  }

  // Reduces one Item's Actions structure to what an Actions-bearing table
  // row needs to display — shared by Effects' tables, the Dashboard's
  // Active Effect Items list, Features' tables, and Inventory's Armor/Gear
  // tables.
  private itemActionsRow(item: Dos100Item): ItemActionsRow {
    const actions = (item.system as { actions: Actions }).actions;
    const hasActions = Object.keys(actions.items).length > 0;
    const uses =
      hasActions && actions.uses.per !== "unlimited"
        ? { value: actions.uses.value, max: actions.uses.max }
        : null;
    return { item, hasActions, uses };
  }

  // Alphabetized rows for an Item type with no Actions structure at all
  // (Ammunition) — a bare wrapper rather than the Item itself, matching
  // every other row partial's `this.item.*` access pattern.
  private inventoryItemRows(type: string): { item: Dos100Item }[] {
    return this.itemsOfType(type).map((item) => ({ item }));
  }

  // Render context, not persisted data: whether a spellcasting subsystem
  // has been populated onto this Actor. TODO: system.spells stays null for
  // the entire MVP (see pc.ts) — there is no spellcasting subsystem to gate
  // yet, only the field this check reads. Also drives _getTabsConfig()
  // below, so the Spells tab and its panel are consistently absent
  // together.
  private hasSpells(): boolean {
    return (this.actor.system as { spells: unknown }).spells !== null;
  }

  override _getTabsConfig(group: string): ApplicationTabsConfiguration | null {
    const config = super._getTabsConfig(group);
    if (group !== "primary" || config === null || this.hasSpells()) return config;
    return { ...config, tabs: config.tabs.filter((tab) => tab.id !== "spells") };
  }

  // Render context, not persisted data: each sequential load bar's fill
  // percentage for the Actor's currently active movement track (base for
  // land/climb/burrow, swim, or fly) — see encumbranceBands() in
  // encumbrance.ts for the calculation itself.
  private encumbranceBands(): EncumbranceBand[] {
    const system = this.actor.system as { encumbrance: Encumbrance; movement: ActorMovement };
    return encumbranceBands(system.encumbrance, system.movement.mode);
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

  // A pinned Effect's quick-use click toggles `active` rather than
  // invoking an Action. Ordinary Items fall through to the existing
  // single-Action path. TODO: only
  // single-Action Items are wired up so far; the first (only) action id is
  // used directly. Multi-Action selection is a future workflow.
  private async onUseQuickItem(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;

    if (item.type === "effect") {
      const active = (item.system as EffectData).active;
      await item.update({ "system.active": !active });
      return;
    }

    const actions = (item.system as { actions?: { items: Record<string, unknown> } }).actions;
    const actionId = actions ? Object.keys(actions.items)[0] : undefined;
    if (!actionId) return;
    await (item as Dos100Item).useAction(actionId);
  }

  private async onTogglePinnedSkill(event: PointerEvent, target: HTMLElement): Promise<void> {
    const tag = target.dataset.tag;
    if (!tag) return;
    const skill = (this.actor.system as { skills: ActorSkills }).skills[tag];
    if (!skill) return;
    await this.actor.update({ [`system.skills.${tag}.pinned`]: !skill.pinned });
  }

  private async onToggleStatus(event: PointerEvent, target: HTMLElement): Promise<void> {
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    await this.actor.toggleStatusEffect(statusId);
  }

  // Shared by any Item-type row with an Actions.pinned control — currently
  // just Effect rows. Binds to `system.actions.pinned`, not a new
  // Effect-specific `pinned` field.
  private async onToggleItemPinned(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;
    const pinned = (item.system as { actions?: Actions }).actions?.pinned;
    if (pinned === undefined) return;
    await item.update({ "system.actions.pinned": !pinned });
  }

  private async onToggleEffectActive(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;
    const active = (item.system as EffectData).active;
    await item.update({ "system.active": !active });
  }

  // Shared by any inventory Item's Carried/Equipped checkbox — Armor, Gear,
  // and Ammunition all carry these two booleans identically.
  private async onToggleItemCarried(event: PointerEvent, target: HTMLElement): Promise<void> {
    await this.toggleItemBoolean(target.dataset.itemId, "carried");
  }

  private async onToggleItemEquipped(event: PointerEvent, target: HTMLElement): Promise<void> {
    await this.toggleItemBoolean(target.dataset.itemId, "equipped");
  }

  private async toggleItemBoolean(itemId: string | undefined, field: "carried" | "equipped"): Promise<void> {
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;
    const value = (item.system as Record<string, unknown>)[field];
    if (typeof value !== "boolean") return;
    await item.update({ [`system.${field}`]: !value });
  }

  // Shared by any Item-type row's Edit/Duplicate/Delete controls — Effects
  // and Features both use these, and nothing here is specific to either.
  private onEditItem(event: PointerEvent, target: HTMLElement): void {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    item?.sheet?.render(true);
  }

  private async onDuplicateItem(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    if (!item) return;
    await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  private async onDeleteItem(event: PointerEvent, target: HTMLElement): Promise<void> {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    await item?.delete();
  }

  // Permanent/Temporary Effects each get their own manual Add control —
  // the group determines the created Effect's initial deleteOnExpire,
  // which is what actually drives its table placement on the next render
  // (see effectGroup() above).
  private async onCreateEffect(event: PointerEvent, target: HTMLElement): Promise<void> {
    const group = target.dataset.group;
    if (group !== "permanent" && group !== "temporary") return;
    await this.actor.createEmbeddedDocuments("Item", [
      {
        name: game.i18n.localize("DOS100.effects.table.newEffectName"),
        type: "effect",
        system: { deleteOnExpire: group === "temporary" },
      },
    ]);
  }
}
