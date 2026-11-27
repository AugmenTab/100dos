import { AbstractItemSheet } from "./abstract-item-sheet.js";

export class AbilityItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "ability"],
  };

  protected override get _showCombatTab(): boolean {
    return true;
  }

  protected override get _typeDetailsPartial(): string | null {
    return "systems/100dos/templates/items/ability-details-fields.hbs";
  }
}
