import { AbstractItemSheet } from "./abstract-item-sheet.js";

export class AbilityItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "ability"],
  };

  static override PARTS = {
    body: { template: "systems/100dos/templates/items/shell/item-shell.hbs" },
  };

  protected override get _showCombatTab(): boolean {
    return true;
  }

  protected override get _typeDetailsPartial(): string | null {
    return "systems/100dos/templates/items/ability-details-fields.hbs";
  }
}
