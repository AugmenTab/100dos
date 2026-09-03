import { type Dos100Item } from "../../documents/item.js";
import { ACTIVATION_TYPES, COST_HIDDEN_TYPES, type ActionData, type ActivationType } from "../../items/action.js";
import { buildActionUpdates } from "./action-updates.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #updateHookId: number | undefined;

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "action-sheet"],
    position: { width: 600, height: 480 },
    window: { resizable: true, title: "DOS100.item.actionSheet.title" },
    form: { handler: ActionSheet.prototype._onSubmitForm, submitOnChange: true },
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
    form: { template: "systems/100dos/templates/items/action/action-shell.hbs", scrollable: [".tab.active"] },
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
    const action = system.actions.items[this.#actionId];
    const activationTypes = Object.entries(ACTIVATION_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === action.activation.type,
    }));
    return {
      ...await super._prepareContext(options),
      sheetId: this.id,
      tabs: { primary: this._prepareTabs("primary") },
      action,
      activationTypes,
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);

    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    this.#updateHookId = Hooks.on("updateItem", (doc: unknown) => {
      if ((doc as { id: string }).id === this.#item.id) void this.render(true);
    });

    const select = this.element.querySelector<HTMLSelectElement>('[name="activation.type"]');
    const costInput = this.element.querySelector<HTMLInputElement>('[name="activation.cost"]');

    const syncCostInput = (type: string): void => {
      if (costInput === null) return;
      const hide = COST_HIDDEN_TYPES.has(type as ActivationType);
      costInput.hidden = hide;
      costInput.disabled = hide;
    };

    if (select !== null) {
      syncCostInput(select.value);
      select.addEventListener("change", () => syncCostInput(select.value));
    }
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    return super.close(options);
  }

  protected async _onSubmitForm(
    _event: Event,
    _form: HTMLFormElement,
    formData: { object: Record<string, unknown> },
  ): Promise<void> {
    await this.#item.update(buildActionUpdates(this.#actionId, formData.object));
  }
}
