import { debug } from "./logger.js";
import { Dos100Actor } from "./documents/actor.js";
import { Dos100Item } from "./documents/item.js";
import { PcActorSheet } from "./sheets/actors/pc-sheet.js";
import { NpcActorSheet } from "./sheets/actors/npc-sheet.js";
import { VehicleActorSheet } from "./sheets/actors/vehicle-sheet.js";
import { AbilityItemSheet } from "./sheets/items/ability-sheet.js";
import { TraitItemSheet } from "./sheets/items/trait-sheet.js";
import { AbilityDataModel } from "./items/ability.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Dos100System {
  // Future registries: setting profiles, change targets, formula helpers, etc.
}

declare global {
  interface Game {
    dos100: Dos100System;
  }
}

Hooks.once("init", (): void => {
  game.settings.register(game.system.id, "debugMode", {
    name: "DOS100.setting.debugMode.name",
    hint: "DOS100.setting.debugMode.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  CONFIG.Actor.documentClass = Dos100Actor;
  Actors.registerSheet(game.system.id, PcActorSheet, {
    types: ["pc"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, NpcActorSheet, {
    types: ["npc"],
    makeDefault: true,
  });
  Actors.registerSheet(game.system.id, VehicleActorSheet, {
    types: ["vehicle"],
    makeDefault: true,
  });

  CONFIG.Item.documentClass = Dos100Item;
  CONFIG.Item.dataModels["ability"] = AbilityDataModel;
  Items.registerSheet(game.system.id, AbilityItemSheet, {
    types: ["ability"],
    makeDefault: true,
  });
  Items.registerSheet(game.system.id, TraitItemSheet, {
    types: ["trait"],
    makeDefault: true,
  });

  debug("Initializing");
  game.dos100 = {};
});

Hooks.once("setup", (): void => {
  debug("Setup complete");
});

Hooks.once("ready", (): void => {
  debug("Ready");
});
