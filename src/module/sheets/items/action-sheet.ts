import { type Dos100Item } from "../../documents/item.js";
import { type ActionData } from "../../items/action.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "action-sheet"],
    position: { width: 600, height: 400 },
    window: { resizable: true, title: "DOS100.item.actionSheet.title" },
  };

  static override TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "DOS100.item.actionSheet.tabs.description" },
        { id: "usage", label: "DOS100.item.actionSheet.tabs.usage" },
        { id: "action", label: "DOS100.item.actionSheet.tabs.action" },
        { id: "miscellaneous", label: "DOS100.item.actionSheet.tabs.miscellaneous" },
      ],
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/action/action-shell.hbs" },
  };

  constructor(item: Dos100Item, actionId: string, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#item = item;
    this.#actionId = actionId;
  }

  get title(): string {
    const system = this.#item.system as { actions: { items: Record<string, ActionData> } };
    const action = system.actions.items[this.#actionId];
    return action?.name ?? game.i18n.localize("DOS100.item.actionSheet.title");
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const system = this.#item.system as { actions: { items: Record<string, ActionData> } };
    return {
      ...await super._prepareContext(options),
      sheetId: this.id,
      tabs: { primary: this._prepareTabs("primary") },
      action: system.actions.items[this.#actionId],
    };
  }
}
