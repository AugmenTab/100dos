import { type AbilityData } from "../items/ability.js";
import { type GrantData } from "../items/grants.js";
import { type UsagePeriod, shouldRecharge } from "../items/action.js";

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
    const ids = this.getFlag(game.system.id, "grantedItemIds") as string[] | undefined;
    if (!ids?.length || !this.actor) return [];
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
    if (game.user?.id !== userId || !this.actor) return;
    const grants = (this.system as { grants?: GrantData[] }).grants;
    if (!grants?.length) return;
    void this._createGrants(grants);
  }

  protected override _onDelete(options: object, userId: string): void {
    if (game.user?.id === userId && this.actor) {
      const ids = this.getFlag(game.system.id, "grantedItemIds") as string[] | undefined;
      if (ids?.length) void this.actor.deleteEmbeddedDocuments("Item", ids);
    }
    super._onDelete(options, userId);
  }

  private async _createGrants(grants: GrantData[]): Promise<void> {
    if (!this.actor) return;
    const created = await this.actor.createEmbeddedDocuments(
      "Item",
      grants.map(g => ({
        name: g.name,
        type: g.type,
        system: g.system,
        flags: { [game.system.id]: { grantedBy: this.id } },
      })),
    );
    await this.setFlag(game.system.id, "grantedItemIds", created.map(i => i.id));
  }

  /**
   * Triggers the named action on this ability, decrementing its uses if
   * limited. Checks both the shared Actions pool and the action's own pool;
   * emits a warning and returns early if either cannot cover the cost.
   */
  async useAction(actionId: string): Promise<void> {
    if (this.type !== "ability") return;
    const system = this.system as AbilityData;
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
    const system = this.system as AbilityData;

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
