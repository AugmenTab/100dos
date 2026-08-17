const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export abstract class Dos100ActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    classes: ["dos100", "sheet", "actor"],
    position: { width: 1000, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...await super._prepareContext(options),
      actor: this.actor,
    };
  }
}
