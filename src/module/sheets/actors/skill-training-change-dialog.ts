import { type SkillCost, type SkillTraining, trainingCostDelta } from "../../skill.js";
import { PromptDialog } from "../prompt-dialog.js";

export type TrainingChangeResult =
  | { action: "record"; xpAmount: number }
  | { action: "skip" }
  | { action: "cancel" };

type Params = {
  skillName: string;
  previous: SkillTraining;
  next: SkillTraining;
  cost: SkillCost;
};

export class SkillTrainingChangeDialog extends PromptDialog<TrainingChangeResult> {
  protected override readonly cancelResult: TrainingChangeResult = { action: "cancel" };
  readonly #params: Params;

  static async prompt(params: Params): Promise<TrainingChangeResult> {
    return new SkillTrainingChangeDialog(params).wait();
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
    window: { title: "DOS100.skillTrainingChange.title" },
    actions: {
      record: SkillTrainingChangeDialog.prototype._onRecord,
      skip: SkillTrainingChangeDialog.prototype._onSkip,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/skill-training-change.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { skillName, previous, next, cost } = this.#params;
    const delta = trainingCostDelta(previous, next, cost);
    const isRefund = delta < 0;
    return {
      skillName,
      previousLabel: game.i18n.localize(`DOS100.skills.training.${previous}`),
      nextLabel: game.i18n.localize(`DOS100.skills.training.${next}`),
      xpAmount: Math.abs(delta),
      xpLabel: game.i18n.localize(isRefund ? "DOS100.skillTrainingChange.xpRefund" : "DOS100.skillTrainingChange.xpCost"),
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
