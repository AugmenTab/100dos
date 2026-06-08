export class AbilityItemSheet extends ItemSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/items/ability.hbs`,
      classes: ["dos100", "sheet", "item", "ability"],
      width: 520,
      height: 480,
      resizable: true,
    };
  }
}
