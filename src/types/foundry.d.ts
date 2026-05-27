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

interface ApplicationOptions {
  classes?: string[];
  template?: string;
  width?: number | "auto";
  height?: number | "auto";
  resizable?: boolean;
  title?: string;
}

interface SheetRegistrationOptions {
  types?: string[];
  makeDefault?: boolean;
  label?: string;
}

declare class Actor {
  readonly type: string;
  readonly name: string;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

declare class ActorSheet {
  readonly actor: Actor;
  static get defaultOptions(): ApplicationOptions;
  getData(): Promise<Record<string, unknown>>;
}

declare class Item {
  readonly type: string;
  readonly name: string;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

declare class ItemSheet {
  static get defaultOptions(): ApplicationOptions;
  getData(): Promise<Record<string, unknown>>;
}

declare const CONFIG: {
  Actor: {
    documentClass: typeof Actor;
  };
  Item: {
    documentClass: typeof Item;
  };
};

declare const Actors: {
  registerSheet(
    scope: string,
    sheetClass: typeof ActorSheet,
    options?: SheetRegistrationOptions,
  ): void;
};

declare const Items: {
  registerSheet(
    scope: string,
    sheetClass: typeof ItemSheet,
    options?: SheetRegistrationOptions,
  ): void;
};

declare const Hooks: {
  once(hook: string, fn: (...args: unknown[]) => void): number;
  on(hook: string, fn: (...args: unknown[]) => void): number;
  off(hook: string, id: number): void;
  call(hook: string, ...args: unknown[]): boolean;
  callAll(hook: string, ...args: unknown[]): boolean;
};
