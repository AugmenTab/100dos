# Item Actions

Items can carry one or more **actions**: discrete activations with their own action economy cost and optional usage tracking. An Item with no actions is passive; its effects are applied entirely through the Changes system. An Item with one or more actions is activatable: something a player triggers during play.

Actions are not limited to Abilities. Every Item type in `ACTIONS_ITEM_TYPES` (`src/module/documents/item.ts`) carries them: `ability`, `trait`, `effect`, `armor`, and `gear`.

Race, Soldier Type and Template deliberately carry no Actions and no Pinned flag. An Action one of them provides belongs on a linked child Trait or Ability, which has its own uses, recharge and pin, and follows its parent's `active` state (see `architecture.md`, "Character composition").

---

## Data model

Every Actions-bearing Item stores a single `system.actions` structure:

```ts
type Actions = {
  uses: ActionsPoolUses;               // the Item's shared uses pool
  items: Record<string, ActionData>;   // the actions themselves
  pinned: boolean;                     // shown in the Dashboard's quick-use row
  notes: ActionNotes;                  // Item-level Effect Notes and Footnotes
};
```

`items` is a plain keyed object, implemented with Foundry's `ObjectField`. Each key is a `foundry.utils.randomID()`-generated string, also stored as the action's `id`, so a single action can be updated by dotted path (`system.actions.items.${id}.uses.value`) without managing array indices.

An action carries its full authored definition. Abbreviated:

```ts
type ActionData = {
  readonly id: string;        // equals the record key
  img: string;
  name: string;
  identifier: string;
  type: ActionType;           // meleeAttack | rangedAttack | thrownAttack | healing | other
  description: string;
  activation: { type: ActivationType; cost: number | null };
  target: string;
  range: ActionRange;
  area: string;
  duration: ActionDuration;
  concentration: boolean;
  dismissible: boolean;
  uses: ActionUses;
  notes: ActionNotes;
  attack?: ActionAttack;              // attack action types only
  damage?: ActionDamage;
  specialRules?: ActionSpecialRules;
  opposedTest: OpposedTest;
};
```

`src/module/items/action.ts` is the authoritative definition. All of these fields are edited through the Action editor (`ActionSheet`). Apart from `uses` and `activation`, they are **authored data only**: nothing yet executes an attack, damage, special rule, or opposed test.

---

## Activation types

| Type | Cost field |
|---|---|
| `nonaction` | Hidden |
| `passive` | Hidden |
| `free` | Hidden |
| `half` | Hidden |
| `full` | Hidden |
| `reaction` | Hidden |
| `attack` | Shown — N attacks |
| `round` | Shown — N rounds |
| `minute` | Shown — N minutes |
| `hour` | Shown — N hours |
| `special` | Hidden |

`COST_HIDDEN_TYPES` in `action.ts` is the single source for which types hide the cost. Where it's shown, `cost` defaults to `null`, treated as 1.

`useAction` ignores actions whose activation type is `passive`.

---

## Uses

Uses are tracked in two independent pools: the Item's **shared pool** (`system.actions.uses`) and each **action's own pool** (`action.uses`).

```ts
type ActionsPoolUses = {
  per: UsagePeriod;
  value: number;      // current remaining uses
  max: number;        // maximum uses; ignored when per === "unlimited"
  formula: string;    // intended source of max — not evaluated yet
};

type ActionUses = ActionsPoolUses & {
  itemCost: ChargeCost;     // deducted from the Item's shared pool
  actionCost: ChargeCost;   // deducted from this action's own pool
};

type ChargeCost = {
  value: number;
  formula: string;     // not evaluated yet
  perAttack: boolean;  // authored only; not applied yet
};
```

Using an action spends `itemCost.value` from the shared pool and `actionCost.value` from the action's own pool, so one action can draw on either pool, both, or neither. A pool whose `per` is `unlimited` is never checked or decremented.

No formula is evaluated yet: `max` and the cost `value`s are the numbers actually used, and are set by hand.

---

## Usage periods

| Period | Restores when |
|---|---|
| `unlimited` | Never tracked; always available |
| `encounter` | At combat start, at combat end, and on daily refill |
| `day` | On daily refill (sleep / rest) |
| `hour` | Every N hours of game time |
| `minute` | Every N minutes of game time |
| `charges` | Never automatically; only via explicit update |

### Recharge cascade

Time-based periods cascade downward. Triggering a recharge at period P also restores every pool whose period has a lower rank:

```
minute(0) < hour(1) < day(2)
```

So a daily recharge restores `minute`, `hour`, and `day` pools. `encounter` sits outside this ranking but is also restored by a daily recharge as a special rule (a full day's rest implies a fresh encounter budget). `charges` is never automatically restored.

The cascade logic lives in `shouldRecharge()` in `src/module/items/action.ts` and is the only place this ordering is defined.

### Recharge triggers

**Encounter** replenishment fires on both the `combatStart` and `deleteCombat` Foundry hooks, restoring every combatant's Actions-bearing Items at the start of a fight and again when it ends. The handler is GM-only, so multiple connected clients don't issue the same update, and it applies one batched `updateEmbeddedDocuments` per Actor.

**Daily** replenishment (and by cascade, all shorter periods) is intended to be triggered by the Dashboard's Rest button and by integration with the Foundry game clock. Neither is implemented yet: the Rest button is inert, and `rechargeActions(period)` / `rechargeUpdates(period)` on `Dos100Item` are the target call sites.

**Minute/hour** replenishment is intended for game-clock-based triggers. Not yet implemented.

**Charges** are never automatically restored. They decrement on use and only recover through explicit Item updates (e.g. a module macro, a GM edit, or a future restock mechanic).

---

## Per-day vs per-24-hours

`"day"` is understood as per-sleep — the culturally normal interpretation in tabletop play. Authors who want strict 24-hour replenishment regardless of sleep should use an `hour` period with a game-clock trigger instead, once one exists.

---

## Item methods

```ts
// Spend uses for one action from both pools. Warns and does nothing if a
// cost is negative or either limited pool can't cover its cost.
item.useAction(actionId: string): Promise<void>

// Restore every pool whose period matches the trigger (with cascade).
item.rechargeActions(period: UsagePeriod | "encounter"): Promise<void>

// The update rechargeActions would apply, or null if nothing needs
// restoring — for callers batching many Items into one update.
item.rechargeUpdates(period: UsagePeriod | "encounter"): Record<string, number> | null
```

All three are no-ops on Item types outside `ACTIONS_ITEM_TYPES`.

The Dashboard's pinned quick-use buttons are currently the only UI path to `useAction`. They support single-Action Items only: the first action is used directly. An Effect's quick-use button toggles the Effect's `active` state instead.
