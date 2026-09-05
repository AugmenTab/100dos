import {
  COST_HIDDEN_TYPES,
  DURATION_VALUE_TYPES,
  RANGE_VALUE_TYPES,
  type ActionDurationType,
  type ActionRangeType,
  type ActivationType,
  type OpposedTestOption,
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

export function buildOpposedTestRows(
  options: OpposedTestOption[],
  localize: (key: string) => string,
): { index: number; label: string }[] {
  return options.map((opt, index) => {
    if (opt.type === "characteristic") {
      const name = localize(`DOS100.characteristic.${opt.characteristic}.full`);
      return { index, label: `${localize("DOS100.action.opposedTest.characteristicPrefix")}: ${name}` };
    }
    const charAbbrs = opt.characteristics.map(id => id.toUpperCase()).join(", ");
    return { index, label: `${localize("DOS100.action.opposedTest.skillPrefix")}: ${opt.name} (${charAbbrs})` };
  });
}

export function deleteOpposedTestOption(options: OpposedTestOption[], index: number): OpposedTestOption[] {
  const result = [...options];
  result.splice(index, 1);
  return result;
}

export function reorderOpposedTestOptions(
  options: OpposedTestOption[],
  fromIndex: number,
  toIndex: number,
): OpposedTestOption[] {
  const result = [...options];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}
