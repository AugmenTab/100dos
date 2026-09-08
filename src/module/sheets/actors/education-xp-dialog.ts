import { type EducationTraining, educationTrainingDelta } from "../../education.js";
import { type EducationCost } from "../../items/education.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

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

export class EducationXpDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  readonly #params: InternalParams;
  #resolve: ((result: EducationXpResult) => void) | null;

  static async promptAcquire(
    educationName: string,
    cost: EducationCost,
  ): Promise<EducationXpResult> {
    return new Promise(resolve => {
      const dialog = new EducationXpDialog({
        title: game.i18n.localize("DOS100.educationXp.acquisitionTitle"),
        educationName,
        subtitleLine: game.i18n.localize("DOS100.educations.training.plus5"),
        defaultAmount: cost.plus5,
        isRefund: false,
      }, resolve);
      void dialog.render(true);
    });
  }

  static async promptTrainingChange(
    educationName: string,
    previous: EducationTraining,
    next: EducationTraining,
    cost: EducationCost,
  ): Promise<EducationXpResult> {
    const delta = educationTrainingDelta(previous, next, cost);
    return new Promise(resolve => {
      const dialog = new EducationXpDialog({
        title: game.i18n.localize("DOS100.educationXp.trainingTitle"),
        educationName,
        subtitleLine: `${game.i18n.localize(`DOS100.educations.training.${previous}`)} → ${game.i18n.localize(`DOS100.educations.training.${next}`)}`,
        defaultAmount: Math.abs(delta),
        isRefund: delta < 0,
      }, resolve);
      void dialog.render(true);
    });
  }

  constructor(
    params: InternalParams,
    resolve: (result: EducationXpResult) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#params = params;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "ability-acquisition-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.educationXp.acquisitionTitle" },
    actions: {
      record: EducationXpDialog.prototype._onRecord,
      skip: EducationXpDialog.prototype._onSkip,
      cancelDialog: EducationXpDialog.prototype._onCancelDialog,
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
    this.#resolve?.({ action: "record", xpAmount });
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
