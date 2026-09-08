import { type EducationTraining, educationRefund } from "../../education.js";
import { type EducationCost } from "../../items/education.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export type EducationDeleteResult =
  | { action: "refundAndDelete"; xpAmount: number }
  | { action: "delete" }
  | { action: "cancel" };

type Params = {
  educationName: string;
  training: EducationTraining;
  cost: EducationCost;
};

export class EducationDeleteDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  readonly #params: Params;
  #resolve: ((result: EducationDeleteResult) => void) | null;

  static async prompt(params: Params): Promise<EducationDeleteResult> {
    return new Promise(resolve => {
      const dialog = new EducationDeleteDialog(params, resolve);
      void dialog.render(true);
    });
  }

  constructor(
    params: Params,
    resolve: (result: EducationDeleteResult) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#params = params;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.educationXp.deleteTitle" },
    actions: {
      refundAndDelete: EducationDeleteDialog.prototype._onRefundAndDelete,
      deleteOnly: EducationDeleteDialog.prototype._onDeleteOnly,
      cancelDialog: EducationDeleteDialog.prototype._onCancelDialog,
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
    this.#resolve?.({ action: "refundAndDelete", xpAmount });
    this.#resolve = null;
    await this.close();
  }

  protected async _onDeleteOnly(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#resolve?.({ action: "delete" });
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
