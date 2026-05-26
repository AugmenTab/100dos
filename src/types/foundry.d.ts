// Hand-rolled Foundry VTT v14 ambient declarations.
// Add types here as APIs are introduced into the system codebase.
// Extend Game via declaration merging in the relevant module, not here.

interface Game {
  settings: ClientSettings;
  system: { id: string };
}

interface ClientSettings {
  get(scope: string, key: string): unknown;
  register(scope: string, key: string, config: SettingConfig): void;
}

interface SettingConfig {
  name: string;
  hint?: string;
  scope: "world" | "client";
  config: boolean;
  type: unknown;
  default: unknown;
}

declare const game: Game;

declare class Actor {
  readonly type: string;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

declare const CONFIG: {
  Actor: {
    documentClass: typeof Actor;
  };
};

declare const Hooks: {
  once(hook: string, fn: (...args: unknown[]) => void): number;
  on(hook: string, fn: (...args: unknown[]) => void): number;
  off(hook: string, id: number): void;
  call(hook: string, ...args: unknown[]): boolean;
  callAll(hook: string, ...args: unknown[]): boolean;
};
