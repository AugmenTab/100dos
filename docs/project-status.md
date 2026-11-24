# Project Status

Snapshot as of 2026-11-24, taken from `sheet-review-fixes` at `e6ef3ec`. It
supersedes the July snapshot in `.local/project_state.md`. It will go stale;
cross-check against the source before relying on specifics.

The short version: the **PC sheet and the Item editors are far along as
authoring and record-keeping tools**, but **the system computes almost
nothing**. `Dos100Actor.prepareDerivedData()` still dispatches to three empty
methods, no formula is ever evaluated, no dice are ever rolled, and no Change
is ever applied. Nearly every number on the PC sheet is a stored field that
defaults to 0 and, for most of them, nothing in the UI can set.

Status terms used below:

- **Implemented**: works end to end in Foundry, with persistence.
- **Wireframed**: the UI and/or schema exists, but it's inert. Buttons with
  no handler, fields nothing writes, or values nothing derives.
- **Missing calculation**: the schema stores a value the rules say is
  derived, and no code derives it.
- **Not started**: neither schema nor UI exists.

---

## 1. Headline gaps

In rough order of how much they block:

1. **No derivation layer.** `Dos100Actor._preparePcData/_prepareNpcData/
   _prepareVehicleData` and `Dos100Item._prepareAbilityData/
   _prepareTraitData` are all empty. Every "derived" value in §4 is stored
   and stays at its default.
2. **Core stats can't be entered.** No sheet field writes Characteristic
   `base`, `advancement` or `value`; Wounds, Luck or Fatigue `max`;
   Initiative; Movement speeds; DR; Mythic Characteristics; or encumbrance
   thresholds. On a fresh PC they're all 0, and the only way to change them
   is a macro (e.g. `.local/seed-test-pc.js`). Characteristic `temp` and the
   resource current values are the only editable stats.
3. **No roll engine.** No `Roll`, no chat card, no degrees of success, no
   crit handling anywhere in `src/`. Every roll icon on the sheet (Skills,
   Educations, Characteristics, Initiative, Feature/Effect/Inventory rows) is
   an inert button. The crit threshold settings exist but are only read as
   defaults for new Action attacks.
4. **No Changes engine.** Changes can be fully authored on Abilities, Traits
   and Effects, with a complete target vocabulary. Nothing gathers, evaluates
   or applies them. Every `contributions` array on the Actor is a breakdown
   slot that nothing fills. `Result<T, E>` is still unused outside its tests,
   because the formula and Change code it was built for doesn't exist.
5. **NPC and Vehicle are placeholders.** Neither has a data model
   registered (`CONFIG.Actor.dataModels` only has `pc`). Each sheet renders a
   name input and a type label.

---

## 2. Implemented

### PC sheet structure

- Ten primary tabs (Dashboard, Record, Combat, Medical, Inventory,
  Features, Skills, Spells, Effects, Settings) and five Record sub-tabs, with
  scroll position kept across re-renders. Spells is hidden unless
  `system.spells` is populated.
- Item drag-and-drop onto the sheet: Abilities (with an XP acquisition
  prompt), Skill stamps and Education stamps (with identifier validation),
  and core same-Actor sorting.
- Biography and Notes as full-page rich text fields.

### Skills and Educations (the most complete Actor feature)

- Both are Actor records under `system.skills` and `system.educations`, not
  embedded Items. They're stamped from Skill and Education Items, or
  authored by hand through create and edit dialogs.
- Pinning (with a Dashboard "Pinned Skills & Educations" region),
  governing-Characteristic selection for Skills, target selection for
  Educations.
- XP integration matching the `.local/plan.md` handoff: training changes
  open a Record/Skip/Cancel dialog with an editable amount and append to the
  XP ledger. Education stamp acquisition, +5↔+10 changes and delete-refund
  are all wired. The cost math lives in tested pure functions
  (`trainingCostDelta`, `educationTrainingDelta`, `educationRefund`).

### Ability, Trait and Effect Items

Shared through `AbstractItemSheet`:

- **Description**, plus **Details**:
  - the Actions table, with create, edit, duplicate and delete;
  - the shared uses pool;
  - Effect Notes and Footnotes;
  - Tags (through a dialog editor) and an identifier;
  - type-specific fields: Ability XP cost, prerequisites and summary; Effect
    duration, stacking rule and delete-on-expire.
- **Changes** tab: computed and conditional Changes, with create, edit,
  duplicate and delete. Targets are chosen in a picker covering the full
  target vocabulary (`change-targets.ts`, `conditional-note-targets.ts`),
  including dynamic Skill and DR-location targets.
- **Links** tab: child and supplement grants, added by drag-and-drop. Grants
  create embedded Items on the owning Actor. Deleting the granter
  cascade-deletes its children. Toggling `active` on the granter propagates
  to its children.
- Identifiers are seeded batch-wide on creation, unique per Actor, with the
  Characteristic IDs reserved.

### Action editor

A separate sheet for one Action on an Item:

- Description and identifier.
- Usage:
  - activation type and cost;
  - target, range, area and duration;
  - concentration and dismissible;
  - limited uses, with separate Item-pool and Action-pool charge costs.
- Action:
  - Action type;
  - Attack: name, held, Characteristic, bonus and crit range;
  - Damage: dice, base, pierce and damage types;
  - Special Rules, each inherited, disabled or overridden;
  - Opposed Tests, including Skill stamps and a target failure effect.

All of it is **data authoring only**. Nothing executes an attack, damage,
special rule or opposed test (see §4).

### Uses and recharge

- `Dos100Item.useAction()` checks and decrements both use pools, warning
  when uses are exhausted or a cost is invalid. It's reachable from the
  Dashboard's pinned quick-use buttons, which only support single-Action
  Items so far.
- Encounter recharge runs on `combatStart` and `deleteCombat`, GM-only,
  with one batched update per Actor.
- The `shouldRecharge()` cascade is unit-tested.

### Effects tab and statuses

- Linked, Permanent and Temporary Effect tables, with an active toggle, a
  create button and the Dashboard's active-Effects list.
- A 23-status palette registered as `CONFIG.statusEffects`, which toggles
  real Foundry statuses on and off.

### Inventory (partial)

- Armor, Gear and Ammunition rows, with carried and equipped toggles plus
  edit, duplicate and delete.
- An encumbrance band display (`encumbranceBands()`, tested). It renders
  from values nothing sets, so in practice the bars are empty (§4).

### Infrastructure

- Vite build, strict TypeScript, ESLint and Prettier.
- 267 Vitest unit tests.
- Two Playwright tiers: 68 browser-tier template tests and 77 e2e tests
  against live Foundry.
- Three typecheck configs: `typecheck`, `typecheck:e2e` and
  `typecheck:browser`.
- Localization in `en.json`.
- A shared `PromptDialog` base for the single-answer dialogs.

---

## 3. Wireframed (UI exists, inert)

| Where | What's inert |
|---|---|
| Dashboard | Rest button (no replenishment trigger); Add Archetype button; Archetype select (no Archetype Item type, so the options are always empty); Characteristic and Initiative roll buttons; reserved tag area; one icon that doesn't render (TODO in `dashboard.hbs`). |
| Record → Basics | Placeholder page. |
| Record → XP / Finances | Ledgers display, but there's no Add-transaction modal and no delete. XP rows are only ever appended by Skill, Education and Ability XP prompts. **Finance rows have no creation path at all.** |
| Combat, Medical, Settings, Spells | Placeholder pages ("This page doesn't have any content yet"). `spellSources` is an empty tab group extension point. |
| Features | Templates, Abilities, Traits and Miscellaneous tables render owned Items. Every Add button is inert (no Template or Miscellaneous Item type; no add flow). Row roll icons are inert. |
| Inventory | Weapons, Equipment, Consumables, Miscellaneous and Containers tables render permanently empty (no such Item types). Row roll, quantity and gift/transfer buttons are inert. |
| Skills / Educations | Description popups and roll buttons are inert. |
| Effects | Each status's rules/journal icon is inert. |
| Armor / Gear / Ammunition Item sheets | Header only (image and name). None of their fields, including their Actions, can be edited from their own sheet. |
| NPC / Vehicle | Name and type label only; no schema. |

---

## 4. Missing calculation

Everything here is a stored field the rules or the code's own comments say
should be derived, with no derivation anywhere in `src/`.

### Characteristics and tests

- **Characteristic `value`.** Should combine `base`, `advancement`, `temp`
  and Change contributions. **`mod`** should be the tens digit (rules
  reference).
- **Skill `value`.** The test target: the governing Characteristic plus the
  training bonus, with untrained penalties of −20 Basic or −40 Advanced.
- **Education `value`**, and the aggregate `education.value/max` (the TODO
  says the relationship to purchased Educations is undefined).
- **Mythic Characteristics.** Stored only.

### Resources

- **Wounds `max`**, Luck `max`, Fatigue `max` and `penalty`, and
  Initiative.
- **XP `earned`, `spent`, `available` and `tier`.** These are never
  recalculated from the ledger. The visible effect: a PC can buy Skills,
  Educations and Abilities, each purchase lands in the ledger, and
  "Available" still reads 0.
- **Finances `received`, `spent` and `available`.** Same, from the ledger.
  `finances.carried` is meant to be "the value of carried Items", but **no
  Item type has a price or value field** to sum.

### Physical

- **Movement.** Every speed carries a `formula` string that is never
  evaluated.
- **Damage Resistance.** Per-location values are stored only. **Armor Items
  have no protection values at all** (carried, equipped, quantity, weight,
  slot and actions only), so there's nothing to derive DR from yet.
- **Item weight.** `weight.felt.total` and `actual.total` aren't derived
  from `each` × `quantity`.
- **Encumbrance.** `carried`, `felt` and `total` aren't summed from carried
  Items, and the thresholds aren't derived from STR or TOU. The band display
  works, but its inputs are always 0.

### Items and actions

- **Uses maximum.** `uses.formula` (pool and per-Action) and the charge-cost
  formulas are never evaluated. `max` is stored and set by hand.
- **Effect duration.** `duration.formula` is never evaluated, nothing
  expires an Effect, and `deleteOnExpire` has no effect (both have TODOs in
  `effect.ts`).
- **Recharge for `day`, `hour` and `minute`.** No rest flow and no
  game-clock hook. `rechargeActions()` is still only reached through the
  encounter hooks.

### Engines with no code yet

- **Formula evaluation.** There's no evaluator and no roll-data context
  shape. Every calculation above that reads a formula depends on this.
- **Changes application.** Gather from active owned Items, evaluate, apply
  `add`/`set`, fill `contributions`. The model doesn't use bonus types,
  per `architecture.md`.
- **The d100 roll-under test.** Degrees of success, crit thresholds (the
  settings exist), difficulty modifiers and a chat card.
- **Attack, damage, special rules and opposed tests.** Fully authorable,
  never executed.
- **Statuses.** They toggle, but carry no Changes and have no mechanical
  effect.

---

## 5. Not started

From `docs/rules-reference.md`, `.local/item_types_research.md` and the
sheet's own placeholders:

- **Actor types.** NPC schema (Bestiary Rank, XP payout), Vehicle schema
  (mobility, crew, 5-location armor and breakpoints, weapon points,
  conceal/sensor), and `companion` and `group` (both still undesigned).
- **Item types.**
  - Named in the rules reference: race, soldierType, outlier, spell.
  - Referenced by the sheet: Archetype and Template (the Dashboard and
    Features assume both exist).
  - Weapons, Equipment, Consumables, Containers and Miscellaneous (each
    already has an empty Inventory table).
- **Actor fields from the rules reference.** Characteristic Active and
  Advanceable flags, Natural Armor, Hardpoints, Energy Shields, Size,
  Support Points, Blood Sugar/Strain.
- **Luck spend and burn flows**, and fatigue penalties applied to tests.
- **Default Skill seeding on new PCs.** Intentionally empty for now
  (`skill.ts` TODO).
- **Character creation wizard.** Explicitly post-MVP.

---

## 6. Inconsistencies and bugs found

1. **Recharge skips most Action-bearing Items.** `ACTIONS_ITEM_TYPES` gives
   Actions to ability, trait, effect, armor and gear, and `useAction()`
   honors all five. But `rechargeUpdates()` returns `null` for anything
   except `ability`, so encounter recharge never restores uses on Traits,
   Effects, Armor or Gear (`src/module/documents/item.ts`).
2. **XP totals never move** (§4). The ledger and the summary disagree as
   soon as one purchase is recorded.
3. **Armor and Gear Actions can't be edited from their own sheets**, even
   though both schemas carry `actions` (header-only templates, §3).
4. **Finance ledger rows can't be created**, and their `id` defaults to
   `""` where XP rows use `randomID()`.
5. **Mythic Characteristics cover only STR/TOU/AGI** in the schema, while
   `.local/project_state.md` and the race description assume all ten. If
   the three-Characteristic Mythic scope is the intended rule, the docs need
   updating, not the code. Worth confirming.

---

## 7. Suggested sequencing

Calculation is now the bottleneck, not UI. One possible order, each step
pure-function-first and Vitest-covered:

1. **A first `_preparePcData` pass with no formulas.**
   - Characteristic `value` and `mod`.
   - Skill and Education test targets.
   - XP and Finances totals from their ledgers.
   - Item weight totals, then encumbrance `carried` and `felt`.

   Make `base` and `advancement` editable (likely the Settings or Basics
   page) so a PC can be entered without a macro. This alone makes the sheet
   usable for play. Fix §6.1 alongside it.
2. **The d100 test and a chat card.** Wire the existing Skill, Education
   and Characteristic roll buttons. Crit thresholds come from the existing
   settings.
3. **A formula evaluator over a defined roll-data context, returning
   `Result`.** This unblocks movement, uses-max, charge costs and Effect
   durations.
4. **Changes application** on top of steps 1 and 3, filling
   `contributions`. Effects and statuses become mechanically meaningful,
   which also unblocks the Rage-style ability-to-Effect automation
   (sc-00152 in the July snapshot).
5. **Combat execution:** attacks, damage and opposed tests, from the
   already-authored Action data.
6. **Breadth:** Armor DR values, the remaining Inventory Item types,
   Archetype and Template, and the NPC and Vehicle schemas.
