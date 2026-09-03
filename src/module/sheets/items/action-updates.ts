import {
  COST_HIDDEN_TYPES,
  DURATION_VALUE_TYPES,
  RANGE_VALUE_TYPES,
  type ActionDurationType,
  type ActionRangeType,
  type ActivationType,
} from "../../items/action.js";

export function buildActionUpdates(
  actionId: string,
  formData: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    updates[`system.actions.items.${actionId}.${key}`] = value;
  }
  if (COST_HIDDEN_TYPES.has(formData["activation.type"] as ActivationType)) {
    updates[`system.actions.items.${actionId}.activation.cost`] = null;
  }
  const rangeType = formData["range.type"] as ActionRangeType | undefined;
  if (rangeType !== undefined && !RANGE_VALUE_TYPES.has(rangeType)) {
    updates[`system.actions.items.${actionId}.range.value`] = "";
  }
  const durationType = formData["duration.type"] as ActionDurationType | undefined;
  if (durationType !== undefined && !DURATION_VALUE_TYPES.has(durationType)) {
    updates[`system.actions.items.${actionId}.duration.value`] = "";
  }
  return updates;
}
