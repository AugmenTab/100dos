export class TraitItemSheet extends ItemSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/items/trait.hbs`,
      classes: ["dos100", "sheet", "item", "trait"],
      width: 520,
      height: 480,
      resizable: true,
    };
  }
}
