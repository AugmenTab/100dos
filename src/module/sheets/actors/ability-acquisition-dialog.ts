import { Dos100Item } from "../../documents/item.js";
import { type AbilityData } from "../../items/ability.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export type AcquisitionResult =
  | { action: "create"; xpCost: number }
  | { action: "skip" }
  | { action: "cancel" };

export class AbilityAcquisitionDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  readonly #item: Dos100Item;
  #resolve: ((result: AcquisitionResult) => void) | null;

  static async prompt(item: Dos100Item): Promise<AcquisitionResult> {
    return new Promise(resolve => {
      const dialog = new AbilityAcquisitionDialog(item, resolve);
      void dialog.render(true);
    });
  }

  constructor(
    item: Dos100Item,
    resolve: (result: AcquisitionResult) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#item = item;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.abilityAcquisition.title" },
    actions: {
      create: AbilityAcquisitionDialog.prototype._onCreate,
      skip: AbilityAcquisitionDialog.prototype._onSkip,
      cancelDialog: AbilityAcquisitionDialog.prototype._onCancelDialog,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/ability-acquisition.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const system = this.#item.system as AbilityData;
    return {
      question: game.i18n.format("DOS100.abilityAcquisition.question", { name: this.#item.name }),
      xpCost: system.xpCost,
    };
  }

  protected async _onCreate(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const input = this.element.querySelector<HTMLInputElement>("input[name='xpCost']");
    const xpCost = Math.max(0, Math.trunc(Number(input?.value ?? 0)));
    this.#resolve?.({ action: "create", xpCost });
    this.#resolve = null;
    await this.close();
  }

  protected async _onSkip(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#resolve?.({ action: "skip" });
    this.#resolve = null;
    await this.close();
  }

  protected async _onCancelDialog(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#resolve?.({ action: "cancel" });
    this.#resolve = null;
    await this.close();
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    this.#resolve?.({ action: "cancel" });
    this.#resolve = null;
    return super.close(options);
  }
}
