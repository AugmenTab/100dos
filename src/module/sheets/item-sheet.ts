export class Dos100ItemSheet extends ItemSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/items/equipment.hbs`,
      classes: ["dos100", "sheet", "item"],
      width: 520,
      height: 480,
      resizable: true,
    };
  }
}
