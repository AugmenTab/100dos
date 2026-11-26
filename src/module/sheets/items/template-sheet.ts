import { CompositionItemSheet } from "./composition-item-sheet.js";
import { type FoundationMode } from "./composition-context.js";

export class TemplateItemSheet extends CompositionItemSheet {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "template"],
  };

  protected override get _foundationMode(): FoundationMode {
    return "none";
  }
}
