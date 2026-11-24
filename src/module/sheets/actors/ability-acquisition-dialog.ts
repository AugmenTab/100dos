import { Dos100Item } from "../../documents/item.js";
import { type AbilityData } from "../../items/ability.js";
import { PromptDialog } from "../prompt-dialog.js";

export type AcquisitionResult =
  | { action: "create"; xpCost: number }
  | { action: "skip" }
  | { action: "cancel" };

export class AbilityAcquisitionDialog extends PromptDialog<AcquisitionResult> {
  protected override readonly cancelResult: AcquisitionResult = { action: "cancel" };
  readonly #item: Dos100Item;

  static async prompt(item: Dos100Item): Promise<AcquisitionResult> {
    return new AbilityAcquisitionDialog(item).wait();
  }

  constructor(
    item: Dos100Item,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#item = item;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.abilityAcquisition.title" },
    actions: {
      create: AbilityAcquisitionDialog.prototype._onCreate,
      skip: AbilityAcquisitionDialog.prototype._onSkip,
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
    await this.settle({ action: "create", xpCost });
  }

  protected async _onSkip(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.settle({ action: "skip" });
  }
}
