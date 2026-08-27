// Hand-rolled Foundry VTT v14 ambient declarations.
// Add types here as APIs are introduced into the system codebase.
// Extend Game via declaration merging in the relevant module, not here.

interface Game {
  settings: ClientSettings;
  system: { id: string };
  i18n: {
    lang: string;
    localize(key: string): string;
    format(key: string, data?: Record<string, string>): string;
  };
  user?: { id: string; isGM: boolean };
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

declare function fromUuid<T = unknown>(uuid: string): Promise<T | null>;

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

interface ApplicationTabConfig {
  id: string;
  label?: string;
  icon?: string;
  cssClass?: string;
}

interface ApplicationTabsConfiguration {
  tabs: ApplicationTabConfig[];
  initial?: string;
  labelPrefix?: string;
}

interface ApplicationTab {
  id: string;
  group: string;
  active: boolean;
  cssClass?: string;
  label?: string;
  icon?: string;
}

interface Collection<T> extends Iterable<T> {
  get(id: string): T | undefined;
  filter(fn: (item: T) => boolean): T[];
  map<U>(fn: (item: T) => U): U[];
}

declare class ActiveEffect {
  readonly id: string;
  readonly statuses: Set<string>;
  readonly duration: {
    value: number | null;
    units: string;
    expiry: string | null;
    expired: boolean;
  };
}

declare class Actor {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly img: string;
  readonly system: object;
  readonly items: Collection<Item>;
  // Live Set of currently-active status ids, derived from this Actor's
  // embedded ActiveEffect documents — not our own Item type of the same
  // conceptual name. See status.ts.
  readonly statuses: Set<string>;
  // The Actor's embedded ActiveEffect documents themselves (statuses and
  // otherwise) — statuses reads which ids are active; this is how their
  // own duration/etc. gets read back.
  readonly effects: Collection<ActiveEffect>;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
  createEmbeddedDocuments(type: string, data: object[]): Promise<Item[]>;
  updateEmbeddedDocuments(type: string, data: object[]): Promise<Item[]>;
  deleteEmbeddedDocuments(type: string, ids: string[]): Promise<Item[]>;
  update(data: Record<string, unknown>): Promise<unknown>;
  toggleStatusEffect(statusId: string, options?: { active?: boolean }): Promise<unknown>;
}

declare class Item {
  readonly id: string;
  readonly uuid: string;
  readonly type: string;
  readonly name: string;
  readonly img: string;
  readonly system: object;
  readonly actor: Actor | null;
  readonly sheet: { render(force?: boolean): unknown } | null;
  prepareData(): void;
  prepareBaseData(): void;
  prepareDerivedData(): void;
  update(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<this>;
  toObject(): Record<string, unknown>;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<this>;
  protected _onCreate(data: object, options: object, userId: string): void;
  protected _onUpdate(data: object, options: object, userId: string): void;
  protected _onDelete(options: object, userId: string): void;
}

declare const CONFIG: {
  Actor: {
    documentClass: typeof Actor;
    dataModels: Record<string, typeof foundry.abstract.TypeDataModel>;
  };
  Item: {
    documentClass: typeof Item;
    dataModels: Record<string, typeof foundry.abstract.TypeDataModel>;
  };
  statusEffects: { id: string; name: string; img: string }[];
};


declare const Handlebars: {
  registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
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
    function escapeHTML(value: unknown): string;
    function hasProperty(object: object, key: string): boolean;
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
          initial?: number | (() => number) | null;
          integer?: boolean;
          min?: number;
          max?: number;
          nullable?: boolean;
        });
      }
      class StringField extends DataField {
        constructor(options?: {
          required?: boolean;
          initial?: string | (() => string) | null;
          blank?: boolean;
          nullable?: boolean;
          choices?: string[];
        });
      }
      class HTMLField extends StringField {
        constructor(options?: { required?: boolean; initial?: string; blank?: boolean; nullable?: boolean });
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
          options?: { required?: boolean; nullable?: boolean; initial?: object | null },
        );
      }
      class ObjectField extends DataField {
        constructor(options?: { required?: boolean; nullable?: boolean; initial?: object | null });
      }
      class TypedObjectField extends ObjectField {
        constructor(element: DataField, options?: { required?: boolean; initial?: object });
      }
      class DocumentUUIDField extends StringField {
        constructor(options?: {
          required?: boolean;
          nullable?: boolean;
          initial?: string | null;
          type?: string;
          embedded?: boolean;
        });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]);
        static DEFAULT_OPTIONS: Record<string, unknown>;
        static PARTS: Record<string, { template: string }>;
        static TABS: Record<string, ApplicationTabsConfiguration>;
        get id(): string;
        get element(): HTMLElement;
        tabGroups: Record<string, string | null>;
        render(force?: boolean, options?: Record<string, unknown>): Promise<this>;
        close(options?: Record<string, unknown>): Promise<this>;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
        _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void;
        _prepareTabs(group: string): Record<string, ApplicationTab>;
        _getTabsConfig(group: string): ApplicationTabsConfiguration | null;
        changeTab(
          tab: string,
          group: string,
          options?: {
            event?: Event;
            navElement?: HTMLElement;
            force?: boolean;
            updatePosition?: boolean;
          },
        ): void;
        _onClickTab(event: PointerEvent): void;
        _onFirstRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
      }
      // Provides _renderHTML and _replaceHTML via PARTS-based Handlebars rendering.
      // Typed as identity (returns T) so that extends expressions remain simple.
      function HandlebarsApplicationMixin<
        T extends new (...args: unknown[]) => ApplicationV2,
      >(Base: T): T;
    }
    namespace handlebars {
      // Fetches and registers each path as a Handlebars partial (keyed by
      // its own path), so it can be referenced elsewhere via {{> "path"}}.
      function loadTemplates(paths: string[]): Promise<unknown[]>;
    }
    namespace sheets {
      class ActorSheetV2 extends api.ApplicationV2 {
        get actor(): Actor;
        get document(): Actor;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
        _onDrop(event: DragEvent): void | Promise<void>;
      }
      class ItemSheetV2 extends api.ApplicationV2 {
        get item(): Item;
        get document(): Item;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
      }
    }
  }
}
