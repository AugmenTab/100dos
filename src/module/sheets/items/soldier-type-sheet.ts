import { CompositionItemSheet } from "./composition-item-sheet.js";
import { type FoundationMode } from "./composition-context.js";

export class SoldierTypeItemSheet extends CompositionItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "soldier-type"],
  };

  protected override get _foundationMode(): FoundationMode {
    return "optional";
  }
}
