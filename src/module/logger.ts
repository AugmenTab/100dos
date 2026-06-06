export function debug(message: string, ...args: unknown[]): void {
  let enabled = false;
  try {
    // game is unavailable before Foundry initializes (e.g. in tests)
    enabled = !!game.settings.get(game.system.id, "debugMode");
  } catch {
    // not initialized; treat as disabled
  }
  if (enabled) console.debug(`100DOS | ${message}`, ...args);
}

export function info(message: string, ...args: unknown[]): void {
  console.log(`100DOS | ${message}`, ...args);
}

export function warn(message: string, ...args: unknown[]): void {
  console.warn(`100DOS | ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  console.error(`100DOS | ${message}`, ...args);
}
