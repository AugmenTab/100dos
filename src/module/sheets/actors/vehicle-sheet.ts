import { Dos100ActorSheet } from "../actor-sheet.js";

export class VehicleActorSheet extends Dos100ActorSheet {
  static override PARTS = {
    body: { template: "systems/100dos/templates/actors/vehicle.hbs" },
  };
}
