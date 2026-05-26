import { debug } from "./logger.js";

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
    name: "Debug Mode",
    hint: "Enable debug logging for the 100DOS system.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
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
