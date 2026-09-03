import { COST_HIDDEN_TYPES, type ActivationType } from "../../items/action.js";

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
  return updates;
}
