import { debug } from "./logger.js";
import { registerHandlebarsHelpers } from "./handlebars-helpers.js";
import { PcDataModel } from "./actors/pc.js";
import { Dos100Actor } from "./documents/actor.js";
import { Dos100Item } from "./documents/item.js";
import { PcActorSheet } from "./sheets/actors/pc-sheet.js";
import { NpcActorSheet } from "./sheets/actors/npc-sheet.js";
import { VehicleActorSheet } from "./sheets/actors/vehicle-sheet.js";
import { AbilityItemSheet } from "./sheets/items/ability-sheet.js";
import { EffectItemSheet } from "./sheets/items/effect-sheet.js";
import { TraitItemSheet } from "./sheets/items/trait-sheet.js";
import { ArmorItemSheet } from "./sheets/items/armor-sheet.js";
import { GearItemSheet } from "./sheets/items/gear-sheet.js";
import { AmmunitionItemSheet } from "./sheets/items/ammunition-sheet.js";
import { SkillItemSheet } from "./sheets/items/skill-sheet.js";
import { EducationItemSheet } from "./sheets/items/education-sheet.js";
import { AbilityDataModel } from "./items/ability.js";
import { EffectDataModel } from "./items/effect.js";
import { TraitDataModel } from "./items/trait.js";
import { ArmorDataModel } from "./items/armor.js";
import { GearDataModel } from "./items/gear.js";
import { AmmunitionDataModel } from "./items/ammunition.js";
import { SkillDataModel } from "./items/skill.js";
import { EducationDataModel } from "./items/education.js";
import { registerStatusEffects } from "./status.js";

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
  registerHandlebarsHelpers();
  registerStatusEffects();

  void foundry.applications.handlebars.loadTemplates([
    "systems/100dos/templates/actors/pc/dashboard.hbs",
    "systems/100dos/templates/actors/pc/record.hbs",
    "systems/100dos/templates/actors/pc/record/basics.hbs",
    "systems/100dos/templates/actors/pc/record/xp.hbs",
    "systems/100dos/templates/actors/pc/record/finances.hbs",
    "systems/100dos/templates/actors/pc/record/biography.hbs",
    "systems/100dos/templates/actors/pc/record/notes.hbs",
    "systems/100dos/templates/actors/pc/combat.hbs",
    "systems/100dos/templates/actors/pc/medical.hbs",
    "systems/100dos/templates/actors/pc/inventory.hbs",
    "systems/100dos/templates/actors/pc/inventory/table-with-actions.hbs",
    "systems/100dos/templates/actors/pc/inventory/table-with-slot.hbs",
    "systems/100dos/templates/actors/pc/inventory/table-simple.hbs",
    "systems/100dos/templates/actors/pc/inventory/row-with-actions.hbs",
    "systems/100dos/templates/actors/pc/inventory/row-with-slot.hbs",
    "systems/100dos/templates/actors/pc/inventory/row-simple.hbs",
    "systems/100dos/templates/actors/pc/features.hbs",
    "systems/100dos/templates/actors/pc/features/row.hbs",
    "systems/100dos/templates/actors/pc/skills.hbs",
    "systems/100dos/templates/actors/pc/spells.hbs",
    "systems/100dos/templates/actors/pc/effects.hbs",
    "systems/100dos/templates/actors/pc/effects/row.hbs",
    "systems/100dos/templates/actors/pc/settings.hbs",
    "systems/100dos/templates/items/item-header.hbs",
    "systems/100dos/templates/items/shell/description-tab.hbs",
    "systems/100dos/templates/items/shell/details-tab.hbs",
    "systems/100dos/templates/items/ability-details-fields.hbs",
    "systems/100dos/templates/items/effect-details-fields.hbs",
    "systems/100dos/templates/items/shell/changes-tab.hbs",
    "systems/100dos/templates/items/shell/links-tab.hbs",
    "systems/100dos/templates/items/dialogs/tags-editor.hbs",
    "systems/100dos/templates/items/dialogs/change-editor.hbs",
    "systems/100dos/templates/items/dialogs/change-target-picker.hbs",
    "systems/100dos/templates/items/dialogs/damage-type-dialog.hbs",
    "systems/100dos/templates/actors/dialogs/ability-acquisition.hbs",
    "systems/100dos/templates/actors/dialogs/actor-skill.hbs",
    "systems/100dos/templates/actors/dialogs/actor-education.hbs",
    "systems/100dos/templates/actors/dialogs/education-xp.hbs",
    "systems/100dos/templates/actors/dialogs/education-delete.hbs",
    "systems/100dos/templates/actors/dialogs/skill-training-change.hbs",
    "systems/100dos/templates/items/education-shell.hbs",
  ]);

  game.settings.register(game.system.id, "debugMode", {
    name: "DOS100.setting.debugMode.name",
    hint: "DOS100.setting.debugMode.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, "criticalSuccessThreshold", {
    name: "DOS100.setting.criticalSuccessThreshold.name",
    hint: "DOS100.setting.criticalSuccessThreshold.hint",
    scope: "world",
    config: true,
    type: Number,
    // @ts-expect-error SettingConfig types lack the range property
    range: { min: 1, max: 10, step: 1 },
    default: 1,
  });

  game.settings.register(game.system.id, "criticalFailureThreshold", {
    name: "DOS100.setting.criticalFailureThreshold.name",
    hint: "DOS100.setting.criticalFailureThreshold.hint",
    scope: "world",
    config: true,
    type: Number,
    // @ts-expect-error SettingConfig types lack the range property
    range: { min: 90, max: 100, step: 1 },
    default: 100,
  });

  CONFIG.Actor.documentClass = Dos100Actor;
  CONFIG.Actor.dataModels["pc"] = PcDataModel;
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
  CONFIG.Item.dataModels["effect"] = EffectDataModel;
  CONFIG.Item.dataModels["trait"] = TraitDataModel;
  CONFIG.Item.dataModels["armor"] = ArmorDataModel;
  CONFIG.Item.dataModels["gear"] = GearDataModel;
  CONFIG.Item.dataModels["ammunition"] = AmmunitionDataModel;
  CONFIG.Item.dataModels["skill"] = SkillDataModel;
  CONFIG.Item.dataModels["education"] = EducationDataModel;
  foundry.documents.collections.Items.registerSheet(game.system.id, AbilityItemSheet, {
    types: ["ability"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, EffectItemSheet, {
    types: ["effect"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, TraitItemSheet, {
    types: ["trait"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, ArmorItemSheet, {
    types: ["armor"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, GearItemSheet, {
    types: ["gear"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, AmmunitionItemSheet, {
    types: ["ammunition"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, SkillItemSheet, {
    types: ["skill"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(game.system.id, EducationItemSheet, {
    types: ["education"],
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
// One updateEmbeddedDocuments per Actor rather than one update per Item, with
// the Actors themselves updated in parallel. Deduplicated by uuid, since a
// linked Actor with several tokens in the combat appears once per combatant.
async function rechargeEncounterUses(combat: Combat): Promise<void> {
  if (!game.user?.isGM) return;
  const actors = new Map<string, Actor>();
  for (const combatant of combat.combatants) {
    if (combatant.actor) actors.set(combatant.actor.uuid, combatant.actor);
  }
  await Promise.all(
    Array.from(actors.values()).map(async (actor) => {
      const updates = Array.from(actor.items).flatMap((item) => {
        const update = (item as Dos100Item).rechargeUpdates("encounter");
        return update === null ? [] : [{ _id: item.id, ...update }];
      });
      if (updates.length > 0) await actor.updateEmbeddedDocuments("Item", updates);
    }),
  );
}

Hooks.on("combatStart", (combat: unknown): void => {
  void rechargeEncounterUses(combat as Combat);
});

Hooks.on("deleteCombat", (combat: unknown): void => {
  void rechargeEncounterUses(combat as Combat);
});
