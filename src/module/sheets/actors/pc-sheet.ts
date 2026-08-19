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
      // TODO: only the Ability Item type carries `pinned` so far. Other
      // Action-bearing Item types (e.g. Weapons) should be added to this
      // filter once they adopt the same field.
      quickUseItems: this.actor.items.filter(
        (item) => item.type === "ability" && (item.system as { pinned?: boolean }).pinned === true,
      ),
      pinnedSkills,
      pinnedEducations,
      hasNoPinnedSkillsOrEducations: pinnedSkills.length === 0 && pinnedEducations.length === 0,
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
  // itself, per .local/plan.md — a renamed User must not require rewriting
  // every row it recorded), and realTime formats to a display string for the
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
  // standalone concept rather than an alias of the XP ledger (per
  // .local/plan.md), so this is a separate method with the same shape
  // rather than a shared abstraction over two schema types that happen to
  // currently look alike.
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
  // below (see .local/plan.md and dashboard.hbs). Derived from
  // system.skills (see skill.ts) rather than embedded Items.
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
  // iteration order. See .local/plan.md; no persisted ordering exists yet.
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
  // skillRows() above. See .local/plan.md; no persisted ordering exists yet.
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
  // option (see .local/plan.md).
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

  private async onTogglePinnedSkill(event: PointerEvent, target: HTMLElement): Promise<void> {
    const tag = target.dataset.tag;
    if (!tag) return;
    const skill = (this.actor.system as { skills: ActorSkills }).skills[tag];
    if (!skill) return;
    await this.actor.update({ [`system.skills.${tag}.pinned`]: !skill.pinned });
  }
}
