import { AbstractItemSheet } from "./abstract-item-sheet.js";

export class TraitItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "trait"],
  };

  static override PARTS = {
    body: { template: "systems/100dos/templates/items/shell/item-shell.hbs" },
  };

  protected override get _showCombatTab(): boolean {
    return true;
  }
}
