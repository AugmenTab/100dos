// Minimal ambient shim for Foundry globals referenced inside page.evaluate()
// callback bodies. Deliberately narrow and independent from
// src/types/foundry.d.ts — this covers only what the E2E harness touches.

// Only the system fields specs read structurally. Row shapes stay unknown;
// a spec casts them to whatever subset it asserts on.
interface E2EItemSystem {
  actions: { items: Record<string, unknown>; pinned: boolean };
  changes: { computed: unknown[]; conditional: unknown[] };
}

interface E2EItemDocument {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly img: string;
  readonly system: Record<string, unknown> & E2EItemSystem;
  readonly actor: E2EActorDocument | null;
  readonly sheet: { id: string; rendered: boolean; render(force?: boolean): Promise<unknown> };
  getFlag(scope: string, key: string): unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

interface E2EActiveEffectDocument {
  readonly id: string;
  readonly statuses: Set<string>;
  readonly duration: { value: number | null; units: string; expiry: string | null; expired: boolean };
  update(data: Record<string, unknown>): Promise<unknown>;
}

interface E2EActorDocument {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly img: string;
  readonly system: Record<string, unknown>;
  readonly sheet: {
    id: string;
    rendered: boolean;
    render(force?: boolean): Promise<unknown>;
    _onDrop(event: object): unknown;
  };
  readonly statuses: Set<string>;
  readonly items: {
    get(id: string): E2EItemDocument | undefined;
    getName(name: string): E2EItemDocument | undefined;
    map<T>(fn: (item: E2EItemDocument) => T): T[];
  };
  getFlag(scope: string, key: string): unknown;
  update(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
  createEmbeddedDocuments(
    type: "Item",
    data: object[],
  ): Promise<E2EItemDocument[]>;
  deleteEmbeddedDocuments(
    type: "Item",
    ids: string[],
  ): Promise<E2EItemDocument[]>;
  toggleStatusEffect(
    statusId: string,
    options?: { active?: boolean },
  ): Promise<E2EActiveEffectDocument | boolean | undefined>;
}

declare const Actor: {
  create(data: object): Promise<E2EActorDocument | undefined>;
};

declare const Item: {
  create(data: object): Promise<E2EItemDocument | undefined>;
};

declare function fromUuid(uuid: string): Promise<{ delete(): Promise<unknown> } | null>;

interface E2EUserDocument {
  readonly id: string;
  readonly name: string;
}

declare const User: {
  create(data: object | object[]): Promise<E2EUserDocument[]>;
};

declare const CONST: {
  USER_ROLES: { GAMEMASTER: number };
};

declare const game: {
  ready: boolean;
  system: { id: string };
  user?: { id: string; isGM: boolean; name: string };
  users: E2EUserDocument[];
  actors: {
    filter(fn: (actor: E2EActorDocument) => boolean): E2EActorDocument[];
    get(id: string): E2EActorDocument | undefined;
    getName(name: string): E2EActorDocument | undefined;
  };
  items: {
    filter(fn: (item: E2EItemDocument) => boolean): E2EItemDocument[];
    getName(name: string): E2EItemDocument | undefined;
  };
  combats: {
    filter(fn: (combat: E2ECombatDocument) => boolean): E2ECombatDocument[];
  };
};

interface E2ECombatDocument {
  readonly id: string;
  getFlag(scope: string, key: string): unknown;
  createEmbeddedDocuments(type: "Combatant", data: object[]): Promise<unknown[]>;
  startCombat(): Promise<unknown>;
  delete(): Promise<unknown>;
}

declare const Combat: {
  create(data: object): Promise<E2ECombatDocument | undefined>;
};

declare const ui: {
  notifications: { clear(): void };
};

interface E2EApplication {
  setPosition(position: { width?: number; height?: number; left?: number; top?: number }): void;
}

declare const foundry: {
  utils: { randomID(): string };
  applications: {
    instances: {
      get(id: string): E2EApplication | undefined;
    };
  };
};
