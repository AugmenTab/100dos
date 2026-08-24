const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

// Reusable shell for Item types representing capabilities/features rather
// than physical inventory objects — header + sidebar + tab navigation, per
// .local/plan.md's "Abstract Item Sheet Shell". Armor/Gear/Ammunition/
// Effect/Trait stay on ItemSheetV2 directly; only concrete abstract types
// (Ability, and later ones) extend this.
export abstract class AbstractItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    classes: ["dos100", "sheet", "item"],
    position: { width: 640, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...await super._prepareContext(options),
      item: this.item,
      sheetId: this.id,
      tabs: { primary: this._prepareTabs("primary") },
      // Sourced from the Item's own type, not hard-coded — reuses Foundry's
      // own auto-registered TYPES.Item.<type> label (see system.json's
      // documentTypes.Item and en.json's TYPES.Item block) rather than a
      // second, duplicate DOS100.<type>.name key.
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
    };
  }
}
