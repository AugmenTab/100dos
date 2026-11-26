// Item types of which an Actor may own any number but have at most one
// active. Each type is exclusive only with itself: a Race and a Soldier Type
// are independent, and either, both, or neither may be active. The shared
// `system.active` field is the only source of truth for which one is
// selected — there is no separate selected-Item reference on the Actor.
export const EXCLUSIVE_ITEM_TYPES: ReadonlySet<string> = new Set(["race", "soldierType"]);

export type ActivationCandidate = { id: string; type: string; active: boolean };

export type ActivationUpdate = { _id: string; "system.active": boolean };

// The minimal batch of updates that leaves `selectedId` as the only active
// Item of `type` among `items` — or, when `selectedId` is null ("None"),
// none of them active. Items already in the right state are left out, so
// an empty result means nothing needs to change. Items of other types are
// never touched.
export function exclusiveActivationUpdates(
  items: Iterable<ActivationCandidate>,
  type: string,
  selectedId: string | null,
): ActivationUpdate[] {
  const updates: ActivationUpdate[] = [];
  for (const item of items) {
    if (item.type !== type) continue;
    const shouldBeActive = item.id === selectedId;
    if (item.active !== shouldBeActive) updates.push({ _id: item.id, "system.active": shouldBeActive });
  }
  return updates;
}

// The Item of `type` currently selected (active), or null for None. If
// stored data somehow has more than one active, the first is reported —
// the next selection change resolves it.
export function selectedItemId(items: Iterable<ActivationCandidate>, type: string): string | null {
  for (const item of items) if (item.type === type && item.active) return item.id;
  return null;
}
