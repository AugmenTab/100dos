const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class ArmorItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "armor"],
    position: { width: 800, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  static override PARTS = {
    body: { template: "systems/100dos/templates/items/armor.hbs" },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...await super._prepareContext(options),
      item: this.item,
    };
  }
}
