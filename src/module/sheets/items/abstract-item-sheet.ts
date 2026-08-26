import { Dos100Item } from "../../documents/item.js";
import { USAGE_PERIODS } from "../../items/action.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

// Reusable shell for Item types representing capabilities/features rather
// than physical inventory objects — header + sidebar + tab navigation, per
// .local/plan.md's "Abstract Item Sheet Shell". Armor/Gear/Ammunition/
// Effect/Trait stay on ItemSheetV2 directly; only concrete abstract types
// (Ability, and later ones) extend this.
export abstract class AbstractItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    classes: ["dos100", "sheet", "item"],
    position: { width: 800, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  static override TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "DOS100.item.tabs.description" },
        { id: "details", label: "DOS100.item.tabs.details" },
        { id: "changes", label: "DOS100.item.tabs.changes" },
        { id: "links", label: "DOS100.item.tabs.links" },
      ],
    },
    links: {
      initial: "children",
      tabs: [
        { id: "children", label: "DOS100.item.links.children.label" },
        { id: "supplements", label: "DOS100.item.links.supplements.label" },
      ],
    },
  };

  protected get _showCombatTab(): boolean {
    return false;
  }

  protected get _typeDetailsPartial(): string | null {
    return null;
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const item = this.item as Dos100Item;
    const sysId = game.system.id;
    const childIds = (item.getFlag(sysId, "childItemIds") as string[] | undefined) ?? [];
    const supplementIds = (item.getFlag(sysId, "supplementItemIds") as string[] | undefined) ?? [];
    const toRow = (id: string) => {
      const granted = item.actor?.items.get(id) as Dos100Item | undefined;
      return granted ? { id: granted.id, name: granted.name, img: granted.img } : null;
    };
    const grantingItem = item.grantingItem;
    const grantSource = grantingItem
      ? { name: grantingItem.name, typeLabel: game.i18n.localize(`TYPES.Item.${grantingItem.type}`) }
      : null;
    return {
      ...await super._prepareContext(options),
      item,
      sheetId: this.id,
      tabs: {
        primary: this._prepareTabs("primary"),
        links: this._prepareTabs("links"),
      },
      // Sourced from the Item's own type, not hard-coded — reuses Foundry's
      // own auto-registered TYPES.Item.<type> label (see system.json's
      // documentTypes.Item and en.json's TYPES.Item block) rather than a
      // second, duplicate DOS100.<type>.name key.
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      showCombatTab: this._showCombatTab,
      typeDetailsPartial: this._typeDetailsPartial,
      grantSource,
      usagePeriods: USAGE_PERIODS,
      childItems: childIds.flatMap(id => { const r = toRow(id); return r ? [r] : []; }),
      supplementItems: supplementIds.flatMap(id => { const r = toRow(id); return r ? [r] : []; }),
    };
  }
}
