import { type AbilityData } from "../items/ability.js";
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

  /**
   * Triggers the named action on this ability, decrementing its uses if
   * limited. Emits a warning and returns early if the action cannot be used.
   */
  async useAction(actionId: string): Promise<void> {
    if (this.type !== "ability") return;
    const system = this.system as AbilityData;
    const action = system.actions[actionId];
    if (!action || action.activation.type === "passive") return;

    if (action.uses.per !== "unlimited" && action.uses.value <= 0) {
      ui.notifications?.warn(
        game.i18n.format("DOS100.action.uses.exhausted", {
          name: `${this.name}: ${action.name}`,
        }),
      );
      return;
    }

    if (action.uses.per !== "unlimited") {
      await this.update({
        [`system.actions.${actionId}.uses.value`]: action.uses.value - 1,
      });
    }
  }

  /**
   * Restores uses for all actions on this ability whose usage period matches
   * the given trigger, following the cascade rules in shouldRecharge.
   */
  async rechargeActions(period: UsagePeriod | "encounter"): Promise<void> {
    if (this.type !== "ability") return;
    const system = this.system as AbilityData;

    const updates: Record<string, number> = {};
    for (const [id, action] of Object.entries(system.actions)) {
      if (shouldRecharge(period, action.uses.per) && action.uses.value < action.uses.max) {
        updates[`system.actions.${id}.uses.value`] = action.uses.max;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.update(updates);
    }
  }
}
