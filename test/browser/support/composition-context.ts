// Context for items/shell/item-shell.hbs rendering a Template, Race, or
// Soldier Type: AbstractItemSheet's shared shell context (see
// ability-context.ts for its derivation) plus the composition Details
// context, computed by the very same compositionContext() the sheet uses —
// so these fixtures can't drift from the real derivation.
import { type TemplateData } from "../../../src/module/items/template.js";
import { type RaceData } from "../../../src/module/items/race.js";
import { type SoldierTypeData } from "../../../src/module/items/soldier-type.js";
import { emptyAdvances } from "../../../src/module/advances.js";
import { type BaseCharacteristics } from "../../../src/module/base-characteristics.js";
import { type BaseMythicCharacteristics } from "../../../src/module/base-mythic-characteristics.js";
import { type BodyLocations } from "../../../src/module/body-location.js";
import { type Size } from "../../../src/module/size.js";
import { compositionContext, type FoundationMode } from "../../../src/module/sheets/items/composition-context.js";
import { buildAbilityContext } from "./ability-context.js";
import { type DeepPartial } from "./deep-partial.js";

export type CompositionType = "template" | "race" | "soldierType";

const MODES: Record<CompositionType, FoundationMode> = { template: "none", race: "required", soldierType: "optional" };
const LABELS: Record<CompositionType, string> = { template: "Template", race: "Race", soldierType: "Soldier Type" };

// Shared AbstractItemData overrides are DeepPartial; the foundational
// fields are taken whole, since partial structures (a half lineup) are
// exactly what these structures forbid.
export type CompositionItemFixture = {
  name?: string;
  system?: DeepPartial<Omit<TemplateData, "advances">> & {
    advances?: Partial<TemplateData["advances"]>;
    xpCost?: number;
    baseCharacteristics?: BaseCharacteristics | null;
    baseMythicCharacteristics?: BaseMythicCharacteristics | null;
    baseSize?: Size | null;
    bodyLocations?: BodyLocations | null;
  };
};

// Each type's own schema initial values (see items/race.ts, soldier-type.ts).
function defaultFoundation(type: CompositionType): Partial<RaceData | SoldierTypeData> {
  if (type === "race") return { xpCost: 0, baseCharacteristics: null, baseMythicCharacteristics: null, baseSize: "normal", bodyLocations: {} };
  if (type === "soldierType") return { xpCost: 0, baseCharacteristics: null, baseMythicCharacteristics: null, baseSize: null, bodyLocations: null };
  return {};
}

export function buildCompositionContext(
  type: CompositionType,
  fixture: CompositionItemFixture = {},
  activeTab: "description" | "details" | "changes" | "links" = "details",
) {
  const { advances, xpCost, baseCharacteristics, baseMythicCharacteristics, baseSize, bodyLocations, ...shared } =
    fixture.system ?? {};
  const shell = buildAbilityContext({ name: fixture.name ?? `[Browser] ${LABELS[type]}`, system: shared }, activeTab);
  const composition = {
    ...defaultFoundation(type),
    ...(xpCost !== undefined ? { xpCost } : {}),
    ...(baseCharacteristics !== undefined ? { baseCharacteristics } : {}),
    ...(baseMythicCharacteristics !== undefined ? { baseMythicCharacteristics } : {}),
    ...(baseSize !== undefined ? { baseSize } : {}),
    ...(bodyLocations !== undefined ? { bodyLocations } : {}),
    advances: { ...emptyAdvances(), ...advances },
  };
  return {
    ...shell,
    item: { ...shell.item, type, system: { ...shell.item.system, ...composition } },
    itemTypeLabel: LABELS[type],
    showCombatTab: false,
    typeDetailsPartial: "systems/100dos/templates/items/composition-details-fields.hbs",
    composition: compositionContext(composition, MODES[type]),
  };
}
