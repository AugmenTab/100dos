export function debug(message: string, ...args: unknown[]): void {
  if (game.settings.get(game.system.id, "debugMode")) {
    console.debug(`100DOS | ${message}`, ...args);
  }
}

export function log(message: string, ...args: unknown[]): void {
  console.log(`100DOS | ${message}`, ...args);
}

export function warn(message: string, ...args: unknown[]): void {
  console.warn(`100DOS | ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  console.error(`100DOS | ${message}`, ...args);
}
