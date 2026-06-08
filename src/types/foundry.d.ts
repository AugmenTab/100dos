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

declare class Item {
  readonly type: string;
  readonly name: string;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

declare const CONFIG: {
  Actor: { documentClass: typeof Actor };
  Item: { documentClass: typeof Item };
};

declare const Actors: {
  registerSheet(
    scope: string,
    sheetClass: new (...args: unknown[]) => unknown,
    options?: SheetRegistrationOptions,
  ): void;
};

declare const Items: {
  registerSheet(
    scope: string,
    sheetClass: new (...args: unknown[]) => unknown,
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

declare namespace foundry {
  namespace applications {
    namespace api {
      class ApplicationV2 {
        static DEFAULT_OPTIONS: Record<string, unknown>;
        static PARTS: Record<string, { template: string }>;
      }
      // Provides _renderHTML and _replaceHTML via PARTS-based Handlebars rendering.
      // Typed as identity (returns T) so that extends expressions remain simple.
      function HandlebarsApplicationMixin<
        T extends new (...args: unknown[]) => ApplicationV2,
      >(Base: T): T;
    }
    namespace sheets {
      class ActorSheetV2 extends api.ApplicationV2 {
        get actor(): Actor;
        get document(): Actor;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
      }
      class ItemSheetV2 extends api.ApplicationV2 {
        get item(): Item;
        get document(): Item;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
      }
    }
  }
}
