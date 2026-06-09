// Hand-rolled Foundry VTT v14 ambient declarations.
// Add types here as APIs are introduced into the system codebase.
// Extend Game via declaration merging in the relevant module, not here.

interface Game {
  settings: ClientSettings;
  system: { id: string };
  i18n: {
    localize(key: string): string;
    format(key: string, data?: Record<string, string>): string;
  };
  user?: { isGM: boolean };
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

declare const ui: {
  notifications?: {
    warn(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };
};

declare class Combatant {
  actor: Actor | null;
}

declare class Combat {
  combatants: Iterable<Combatant>;
}

interface SheetRegistrationOptions {
  types?: string[];
  makeDefault?: boolean;
  label?: string;
}

declare class Actor {
  readonly type: string;
  readonly name: string;
  readonly items: Iterable<Item>;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

declare class Item {
  readonly type: string;
  readonly name: string;
  readonly system: object;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
  update(data: Record<string, unknown>): Promise<unknown>;
}

declare const CONFIG: {
  Actor: { documentClass: typeof Actor };
  Item: {
    documentClass: typeof Item;
    dataModels: Record<string, typeof foundry.abstract.TypeDataModel>;
  };
};


declare const Hooks: {
  once(hook: string, fn: (...args: unknown[]) => void): number;
  on(hook: string, fn: (...args: unknown[]) => void): number;
  off(hook: string, id: number): void;
  call(hook: string, ...args: unknown[]): boolean;
  callAll(hook: string, ...args: unknown[]): boolean;
};

declare namespace foundry {
  namespace utils {
    function randomID(length?: number): string;
  }
  namespace abstract {
    class TypeDataModel {
      static defineSchema(): Record<string, foundry.data.fields.DataField>;
    }
  }
  namespace data {
    namespace fields {
      class DataField {}
      class NumberField extends DataField {
        constructor(options?: {
          required?: boolean;
          initial?: number;
          integer?: boolean;
          min?: number;
          max?: number;
          nullable?: boolean;
        });
      }
      class StringField extends DataField {
        constructor(options?: {
          required?: boolean;
          initial?: string | (() => string);
          blank?: boolean;
          nullable?: boolean;
        });
      }
      class BooleanField extends DataField {
        constructor(options?: { required?: boolean; initial?: boolean });
      }
      class ArrayField extends DataField {
        constructor(element: DataField, options?: { required?: boolean; initial?: unknown[] });
      }
      class SchemaField extends DataField {
        constructor(
          fields: Record<string, DataField>,
          options?: { required?: boolean },
        );
      }
      class ObjectField extends DataField {
        constructor(options?: { required?: boolean; initial?: object });
      }
    }
  }
  namespace documents {
    namespace collections {
      class Actors {
        static registerSheet(
          scope: string,
          sheetClass: new (...args: unknown[]) => unknown,
          options?: SheetRegistrationOptions,
        ): void;
      }
      class Items {
        static registerSheet(
          scope: string,
          sheetClass: new (...args: unknown[]) => unknown,
          options?: SheetRegistrationOptions,
        ): void;
      }
    }
  }
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
