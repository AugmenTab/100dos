import { Dos100ActorSheet } from "../actor-sheet.js";

export class PcActorSheet extends Dos100ActorSheet {
  static override PARTS = {
    body: { template: "systems/100dos/templates/actors/pc.hbs" },
  };
}
