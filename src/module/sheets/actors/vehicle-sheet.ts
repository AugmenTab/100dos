import { Dos100ActorSheet } from "../actor-sheet.js";

export class VehicleActorSheet extends Dos100ActorSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/actors/vehicle.hbs`,
    };
  }
}
