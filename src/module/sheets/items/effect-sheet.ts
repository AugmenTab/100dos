import { DURATION_UNITS, EFFECT_EXPIRATIONS, STACKING_RULES } from "../../items/effect.js";
import { AbstractItemSheet } from "./abstract-item-sheet.js";

export class EffectItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "effect"],
  };

  static override PARTS = {
    body: { template: "systems/100dos/templates/items/shell/item-shell.hbs" },
  };

  protected override get _typeDetailsPartial(): string | null {
    return "systems/100dos/templates/items/effect-details-fields.hbs";
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...await super._prepareContext(options),
      durationUnits: DURATION_UNITS,
      effectExpirations: EFFECT_EXPIRATIONS,
      stackingRules: STACKING_RULES,
    };
  }
}
