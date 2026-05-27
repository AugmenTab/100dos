import { Dos100ActorSheet } from "../actor-sheet.js";

export class NpcActorSheet extends Dos100ActorSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/actors/npc.hbs`,
    };
  }
}
