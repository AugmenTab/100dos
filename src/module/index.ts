import { debug } from "./logger.js";
import { Dos100Actor } from "./documents/actor.js";
import { Dos100Item } from "./documents/item.js";
import { PcActorSheet } from "./sheets/actors/pc-sheet.js";
import { NpcActorSheet } from "./sheets/actors/npc-sheet.js";
import { VehicleActorSheet } from "./sheets/actors/vehicle-sheet.js";
import { AbilityItemSheet } from "./sheets/items/ability-sheet.js";
import { TraitItemSheet } from "./sheets/items/trait-sheet.js";
import { AbilityDataModel } from "./items/ability.js";
import { TraitDataModel } from "./items/trait.js";

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
  foundry.documents.collections.Actors.registerSheet(game.system.id, PcActorSheet, {
    types: ["pc"],
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet(game.system.id, NpcActorSheet, {
    types: ["npc"],
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet(game.system.id, VehicleActorSheet, {
    types: ["vehicle"],
    makeDefault: true,
  });

  CONFIG.Item.documentClass = Dos100Item;
  CONFIG.Item.dataModels["ability"] = AbilityDataModel;
  CONFIG.Item.dataModels["trait"] = TraitDataModel;
  foundry.documents.collections.Items.registerSheet(game.system.id, AbilityItemSheet, {
    types: ["ability"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, TraitItemSheet, {
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

// Recharge per-encounter ability uses at both combat start and combat end,
// so abilities are always fresh entering a fight and restored after one ends.
// GM-only to avoid simultaneous updates from multiple connected clients.
async function rechargeEncounterUses(combat: Combat): Promise<void> {
  if (!game.user?.isGM) return;
  for (const combatant of combat.combatants) {
    if (!combatant.actor) continue;
    for (const item of combatant.actor.items) {
      if (item.type === "ability") {
        await (item as Dos100Item).rechargeActions("encounter");
      }
    }
  }
}

Hooks.on("combatStart", (combat: unknown): void => {
  void rechargeEncounterUses(combat as Combat);
});

Hooks.on("deleteCombat", (combat: unknown): void => {
  void rechargeEncounterUses(combat as Combat);
});
