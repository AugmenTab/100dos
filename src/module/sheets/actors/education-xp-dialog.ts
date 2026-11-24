import { type EducationTraining, educationTrainingDelta } from "../../education.js";
import { type EducationCost } from "../../items/education.js";
import { PromptDialog } from "../prompt-dialog.js";

export type EducationXpResult =
  | { action: "record"; xpAmount: number }
  | { action: "skip" }
  | { action: "cancel" };

type InternalParams = {
  title: string;
  educationName: string;
  subtitleLine: string;
  defaultAmount: number;
  isRefund: boolean;
};

export class EducationXpDialog extends PromptDialog<EducationXpResult> {
  protected override readonly cancelResult: EducationXpResult = { action: "cancel" };
  readonly #params: InternalParams;

  static async promptAcquire(
    educationName: string,
    cost: EducationCost,
  ): Promise<EducationXpResult> {
    return new EducationXpDialog({
      title: game.i18n.localize("DOS100.educationXp.acquisitionTitle"),
      educationName,
      subtitleLine: game.i18n.localize("DOS100.educations.training.plus5"),
      defaultAmount: cost.plus5,
      isRefund: false,
    }).wait();
  }

  static async promptTrainingChange(
    educationName: string,
    previous: EducationTraining,
    next: EducationTraining,
    cost: EducationCost,
  ): Promise<EducationXpResult> {
    const delta = educationTrainingDelta(previous, next, cost);
    return new EducationXpDialog({
      title: game.i18n.localize("DOS100.educationXp.trainingTitle"),
      educationName,
      subtitleLine: `${game.i18n.localize(`DOS100.educations.training.${previous}`)} → ${game.i18n.localize(`DOS100.educations.training.${next}`)}`,
      defaultAmount: Math.abs(delta),
      isRefund: delta < 0,
    }).wait();
  }

  constructor(
    params: InternalParams,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#params = params;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.educationXp.acquisitionTitle" },
    actions: {
      record: EducationXpDialog.prototype._onRecord,
      skip: EducationXpDialog.prototype._onSkip,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/education-xp.hbs" },
  };

  get title(): string {
    return this.#params.title;
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      educationName: this.#params.educationName,
      subtitleLine: this.#params.subtitleLine,
      xpAmount: this.#params.defaultAmount,
      xpLabel: game.i18n.localize(
        this.#params.isRefund ? "DOS100.skillTrainingChange.xpRefund" : "DOS100.skillTrainingChange.xpCost",
      ),
    };
  }

  protected async _onRecord(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const input = this.element.querySelector<HTMLInputElement>("input[name='xpAmount']");
    const xpAmount = Math.trunc(Number(input?.value ?? 0));
    await this.settle({ action: "record", xpAmount });
  }

  protected async _onSkip(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.settle({ action: "skip" });
  }
}
