import { type GrantData } from "../items/grants.js";
import { type Actions, type UsagePeriod, shouldRecharge } from "../items/action.js";

// Item types whose system data carries the shared Actions structure —
// checked explicitly rather than duck-typed, since not every Item type
// has (or will have) one.
export const ACTIONS_ITEM_TYPES = new Set(["ability", "trait", "effect", "armor", "gear"]);

// Item types that carry system.identifier and receive automatic seeding
// on creation.
export const ABSTRACT_ITEM_TYPES = new Set(["ability", "trait", "effect"]);

function toCamelCase(str: string): string {
  const words = str.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 0);
  if (words.length === 0) return "item";
  return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

export class Dos100Item extends Item {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "ability":
        this._prepareAbilityData();
        break;
      case "trait":
        this._prepareTraitData();
        break;
    }
  }

  protected _prepareAbilityData(): void {}
  protected _prepareTraitData(): void {}

  get grantedItems(): Dos100Item[] {
    if (!this.actor) return [];
    const childIds = this.getFlag(game.system.id, "childItemIds") as string[] | undefined;
    const supplementIds = this.getFlag(game.system.id, "supplementItemIds") as string[] | undefined;
    const ids = [...(childIds ?? []), ...(supplementIds ?? [])];
    return ids.flatMap(id => {
      const item = this.actor!.items.get(id);
      return item ? [item as Dos100Item] : [];
    });
  }

  get grantingItem(): Dos100Item | null {
    const id = this.getFlag(game.system.id, "grantedBy") as string | undefined;
    if (!id || !this.actor) return null;
    return (this.actor.items.get(id) as Dos100Item) ?? null;
  }

  protected override _onCreate(data: object, options: object, userId: string): void {
    super._onCreate(data, options, userId);
    if (game.user?.id !== userId) return;
    if (ABSTRACT_ITEM_TYPES.has(this.type) && !(this.system as { identifier: string }).identifier) {
      void this._seedIdentifier();
    }
    if (!this.actor) return;
    const grants = (this.system as { grants?: GrantData[] }).grants;
    if (!grants?.length) return;
    void this._createGrants(grants);
  }

  private async _seedIdentifier(): Promise<void> {
    const base = toCamelCase(this.name ?? "");
    const taken = new Set(
      (this.actor?.items ?? ([] as Item[]))
        .filter(i => i.id !== this.id && ABSTRACT_ITEM_TYPES.has(i.type))
        .map(i => (i.system as { identifier?: string }).identifier)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    let slug = base;
    let counter = 2;
    while (taken.has(slug)) {
      slug = `${base}${counter}`;
      counter++;
    }
    await this.update({ "system.identifier": slug });
  }

  protected override _onUpdate(data: object, options: object, userId: string): void {
    super._onUpdate(data, options, userId);
    if (game.user?.id !== userId || !this.actor) return;
    if (!foundry.utils.hasProperty(data, "system.active")) return;
    const childIds = this.getFlag(game.system.id, "childItemIds") as string[] | undefined;
    if (!childIds?.length) return;
    const active = (this.system as { active?: boolean }).active;
    const targets = childIds.flatMap(id => {
      const item = this.actor!.items.get(id);
      return item && ACTIONS_ITEM_TYPES.has(item.type) ? [{ _id: item.id, "system.active": active }] : [];
    });
    if (targets.length) void this.actor.updateEmbeddedDocuments("Item", targets);
  }

  protected override _onDelete(options: object, userId: string): void {
    if (game.user?.id === userId && this.actor) {
      const childIds = this.getFlag(game.system.id, "childItemIds") as string[] | undefined;
      if (childIds?.length) void this.actor.deleteEmbeddedDocuments("Item", childIds);
    }
    super._onDelete(options, userId);
  }

  private async _createGrants(grants: GrantData[]): Promise<void> {
    if (!this.actor) return;
    const sysId = game.system.id;
    // Embed a slot index in each item's flags so we can match the returned
    // documents back to their source grants regardless of return order —
    // createEmbeddedDocuments does not guarantee input-order output.
    const created = await this.actor.createEmbeddedDocuments(
      "Item",
      grants.map((g, i) => ({
        name: g.name,
        type: g.type,
        system: g.system,
        flags: { [sysId]: { grantedBy: this.id, _grantSlot: i } },
      })),
    );
    const childIds: string[] = [];
    const supplementIds: string[] = [];
    for (const item of created) {
      const slot = item.getFlag(sysId, "_grantSlot") as number | undefined;
      if (slot === undefined) continue;
      const g = grants[slot];
      if (!g) continue;
      if (g.kind === "child") childIds.push(item.id!);
      else supplementIds.push(item.id!);
    }
    await this.setFlag(sysId, "childItemIds", childIds);
    await this.setFlag(sysId, "supplementItemIds", supplementIds);
  }

  /**
   * Triggers the named action on this Item, decrementing its uses if
   * limited. Checks both the shared Actions pool and the action's own pool;
   * emits a warning and returns early if either cannot cover the cost.
   */
  async useAction(actionId: string): Promise<void> {
    if (!ACTIONS_ITEM_TYPES.has(this.type)) return;
    const system = this.system as { actions: Actions };
    const action = system.actions.items[actionId];
    if (!action || action.activation.type === "passive") return;

    if (action.uses.cost < 0) {
      ui.notifications?.warn(
        game.i18n.format("DOS100.action.uses.invalidCost", {
          name: `${this.name}: ${action.name}`,
        }),
      );
      return;
    }

    const sharedPool = system.actions.uses;
    const actionPool = action.uses;
    const exhausted =
      (sharedPool.per !== "unlimited" && sharedPool.value < action.uses.cost) ||
      (actionPool.per !== "unlimited" && actionPool.value < action.uses.cost);

    if (exhausted) {
      ui.notifications?.warn(
        game.i18n.format("DOS100.action.uses.exhausted", {
          name: `${this.name}: ${action.name}`,
        }),
      );
      return;
    }

    const updates: Record<string, number> = {};

    if (sharedPool.per !== "unlimited") {
      updates["system.actions.uses.value"] = sharedPool.value - action.uses.cost;
    }

    if (actionPool.per !== "unlimited") {
      updates[`system.actions.items.${actionId}.uses.value`] = actionPool.value - action.uses.cost;
    }

    if (Object.keys(updates).length > 0) {
      await this.update(updates);
    }
  }

  /**
   * Restores uses for all actions on this ability whose usage period matches
   * the given trigger, following the cascade rules in shouldRecharge. Also
   * restores the shared Actions pool if its period matches.
   */
  async rechargeActions(period: UsagePeriod | "encounter"): Promise<void> {
    if (this.type !== "ability") return;
    const system = this.system as { actions: Actions };

    const updates: Record<string, number> = {};

    const sharedPool = system.actions.uses;
    if (shouldRecharge(period, sharedPool.per) && sharedPool.value < sharedPool.max) {
      updates["system.actions.uses.value"] = sharedPool.max;
    }

    for (const [id, action] of Object.entries(system.actions.items)) {
      if (shouldRecharge(period, action.uses.per) && action.uses.value < action.uses.max) {
        updates[`system.actions.items.${id}.uses.value`] = action.uses.max;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.update(updates);
    }
  }
}
