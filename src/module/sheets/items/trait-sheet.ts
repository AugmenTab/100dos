import { AbstractItemSheet } from "./abstract-item-sheet.js";

export class TraitItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "trait"],
  };

  protected override get _showCombatTab(): boolean {
    return true;
  }
}
