// Minimal ambient shim for Foundry globals referenced inside page.evaluate()
// callback bodies. Deliberately narrow and independent from
// src/types/foundry.d.ts — this covers only what the E2E harness touches.

interface E2EItemDocument {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly actor: E2EActorDocument | null;
  readonly sheet: { id: string; render(force?: boolean): Promise<unknown> };
  getFlag(scope: string, key: string): unknown;
}

interface E2EActorDocument {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly items: {
    get(id: string): E2EItemDocument | undefined;
    map<T>(fn: (item: E2EItemDocument) => T): T[];
  };
  getFlag(scope: string, key: string): unknown;
  delete(): Promise<unknown>;
  createEmbeddedDocuments(
    type: "Item",
    data: object[],
  ): Promise<E2EItemDocument[]>;
  deleteEmbeddedDocuments(
    type: "Item",
    ids: string[],
  ): Promise<E2EItemDocument[]>;
}

declare const Actor: {
  create(data: object): Promise<E2EActorDocument | undefined>;
};

declare const game: {
  ready: boolean;
  system: { id: string };
  user?: { id: string; isGM: boolean; name: string };
  actors: {
    filter(fn: (actor: E2EActorDocument) => boolean): E2EActorDocument[];
    get(id: string): E2EActorDocument | undefined;
  };
};

declare const ui: {
  notifications: { clear(): void };
};
