import { Dos100ActorSheet } from "../actor-sheet.js";

export class PcActorSheet extends Dos100ActorSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/actors/pc.hbs`,
    };
  }
}
