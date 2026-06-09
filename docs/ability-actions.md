# Ability Actions

Abilities can carry one or more **actions** — discrete activations with their own action economy cost and optional usage tracking. An ability with no actions is passive; its effects are applied entirely through the Changes system. An ability with one or more actions is activatable: something a player triggers during play.

---

## Data model

Actions are stored on the ability item under `system.actions` as a plain keyed object (`Record<string, ActionData>`), where each key is a `foundry.utils.randomID()`-generated string. The same ID is stored as the `id` field inside each action so callers can access it without a separate key reference. This is implemented using Foundry's `ObjectField`, which allows individual actions to be updated via dotted-path notation (`system.actions.${id}.uses.value`) without managing array indices.

Each action has the following shape:

```ts
type ActionData = {
  readonly id: string;        // equals the record key; generated via foundry.utils.randomID()
  name: string;               // display name for this action
  activation: {
    type: ActivationType;
    cost: number | null;      // the N in "N Half Actions" or "2 Minutes"; null = implicit 1
  };
  uses: {
    per: UsagePeriod;
    value: number;            // current remaining uses
    max: number;              // maximum uses; ignored when per === "unlimited"
  };
};
```

---

## Activation types

| Type | Action economy cost | Cost field |
|---|---|---|
| `passive` | None — always on | Hidden |
| `free` | Free Action | Hidden |
| `half` | N × Half Action | Shown |
| `full` | N × Full Action | Shown |
| `reaction` | Reaction | Hidden |
| `attack` | N attacks | Shown |
| `turn` | N Turns | Shown |
| `minute` | N minutes | Shown |
| `hour` | N hours | Shown |
| `special` | GM-defined | Shown |

The `cost` field is hidden for `passive`, `free`, and `reaction` because a numeric multiplier is meaningless for them. For all other types, `cost` defaults to `null` (treated as 1) and is shown in the sheet when the author needs to express a quantity — e.g. `{ type: "half", cost: 3 }` means "takes 3 Half Actions" and is how an Extended Action is represented, rather than having a separate Extended Action type.

Passive abilities should have no actions at all. The `activation.type === "passive"` value exists to mark actions that have been added to an ability but intentionally produce no active trigger — `useAction` ignores them.

---

## Usage periods

| Period | Restores when |
|---|---|
| `unlimited` | Never tracked; action is always available |
| `encounter` | At combat start, at combat end, and on daily refill |
| `day` | On daily refill (sleep / rest) |
| `hour` | Every N hours of game time |
| `minute` | Every N minutes of game time |
| `charges` | Never automatically; only via explicit update |

### Recharge cascade

Time-based periods cascade downward. Triggering a recharge at period P also restores all actions whose period has a lower rank:

```
minute(0) < hour(1) < day(2)
```

So a daily recharge restores `minute`, `hour`, and `day` actions. `encounter` sits outside this ranking but is also restored by a daily recharge as a special rule (a full day's rest implies a fresh encounter budget). `charges` is never automatically restored.

The cascade logic lives in `shouldRecharge()` in `src/module/items/action.ts` and is the only place this ordering is defined.

### Recharge triggers

**Encounter** replenishment fires on both `combatStart` and `deleteCombat` Foundry hooks, so abilities are restored at the start of a new fight and again when the fight ends. The hook handler is GM-only to prevent multiple connected clients from issuing the same update simultaneously.

**Daily** replenishment (and by cascade, all shorter periods) will be triggered by a rest/sleep button on the actor sheet and by integration with the Foundry game clock. Neither is implemented yet — the `rechargeActions(period)` method on `Dos100Item` is the target call site for both.

**Minute/hour** replenishment is intended for game-clock-based triggers. The mechanism is not yet implemented.

**Charges** are never automatically restored. They decrement on use and only recover through explicit item updates (e.g. a module macro, a GM edit, or a future restock mechanic).

---

## Per-day vs per-24-hours

`"day"` is understood as per-sleep — the culturally normal interpretation in tabletop play. Authors who want strict 24-hour replenishment regardless of sleep should use `{ type: "hour", cost: 24 }` with a game-clock trigger instead.

---

## Item methods

```ts
// Decrement uses for a specific action. Emits a warning if uses are exhausted.
item.useAction(actionId: string): Promise<void>

// Restore uses for all actions whose period matches the trigger (with cascade).
item.rechargeActions(period: UsagePeriod | "encounter"): Promise<void>
```

Both are no-ops when called on non-ability items.
