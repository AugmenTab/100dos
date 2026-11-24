import { type EducationTraining, educationRefund } from "../../education.js";
import { type EducationCost } from "../../items/education.js";
import { PromptDialog } from "../prompt-dialog.js";

export type EducationDeleteResult =
  | { action: "refundAndDelete"; xpAmount: number }
  | { action: "delete" }
  | { action: "cancel" };

type Params = {
  educationName: string;
  training: EducationTraining;
  cost: EducationCost;
};

export class EducationDeleteDialog extends PromptDialog<EducationDeleteResult> {
  protected override readonly cancelResult: EducationDeleteResult = { action: "cancel" };
  readonly #params: Params;

  static async prompt(params: Params): Promise<EducationDeleteResult> {
    return new EducationDeleteDialog(params).wait();
  }

  constructor(
    params: Params,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#params = params;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.educationXp.deleteTitle" },
    actions: {
      refundAndDelete: EducationDeleteDialog.prototype._onRefundAndDelete,
      deleteOnly: EducationDeleteDialog.prototype._onDeleteOnly,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/education-delete.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { educationName, training, cost } = this.#params;
    const trainingLabel = game.i18n.localize(`DOS100.educations.training.${training}`);
    return {
      educationName,
      trainingLine: game.i18n.format("DOS100.educationXp.currentTraining", { training: trainingLabel }),
      xpAmount: Math.abs(educationRefund(training, cost)),
    };
  }

  protected async _onRefundAndDelete(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const input = this.element.querySelector<HTMLInputElement>("input[name='xpAmount']");
    const xpAmount = Math.trunc(Number(input?.value ?? 0));
    await this.settle({ action: "refundAndDelete", xpAmount });
  }

  protected async _onDeleteOnly(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.settle({ action: "delete" });
  }
}
