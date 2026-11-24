import {
  SKILL_DIFFICULTIES,
  SKILL_TYPES,
  type SkillDifficulty,
  type SkillType,
  type ActorSkillDefinition,
} from "../../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import { identifierProblemMessage } from "../../identifier.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export type ActorSkillDialogResult =
  | { action: "save"; definition: ActorSkillDefinition }
  | { action: "cancel" };

type DialogMode = "create" | "edit";

export class ActorSkillDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  readonly #mode: DialogMode;
  readonly #initial: Partial<ActorSkillDefinition>;
  #resolve: ((result: ActorSkillDialogResult) => void) | null;

  static async promptCreate(): Promise<ActorSkillDialogResult> {
    return new Promise(resolve => {
      const dialog = new ActorSkillDialog("create", {}, resolve);
      void dialog.render(true);
    });
  }

  static async promptEdit(identifier: string, skill: Omit<ActorSkillDefinition, "identifier">): Promise<ActorSkillDialogResult> {
    return new Promise(resolve => {
      const dialog = new ActorSkillDialog("edit", { ...skill, identifier }, resolve);
      void dialog.render(true);
    });
  }

  constructor(
    mode: DialogMode,
    initial: Partial<ActorSkillDefinition>,
    resolve: (result: ActorSkillDialogResult) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#mode = mode;
    this.#initial = initial;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "actor-skill-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.actorSkill.dialog.createTitle" },
    actions: {
      saveAndClose: ActorSkillDialog.prototype._onSaveAndClose,
      cancelDialog: ActorSkillDialog.prototype._onCancelDialog,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/actor-skill.hbs" },
  };

  get title(): string {
    const key = this.#mode === "create"
      ? "DOS100.actorSkill.dialog.createTitle"
      : "DOS100.actorSkill.dialog.editTitle";
    return game.i18n.localize(key);
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const cur = this.#initial;

    const difficulties = SKILL_DIFFICULTIES.map(d => ({
      value: d,
      label: game.i18n.localize(`DOS100.skills.difficulty.${d}`),
      selected: (cur.difficulty ?? SKILL_DIFFICULTIES[0]) === d,
    }));

    const types = SKILL_TYPES.map(t => ({
      value: t,
      label: game.i18n.localize(`DOS100.skills.type.${t}`),
      checked: (cur.type ?? []).includes(t),
    }));

    const characteristics = CHARACTERISTIC_IDS.map((id: CharacteristicId) => ({
      value: id,
      label: game.i18n.localize(`DOS100.characteristic.${id}.abbr`),
      checked: (cur.characteristics ?? []).includes(id),
    }));

    return {
      sheetId: this.id,
      name: cur.name ?? "",
      difficulties,
      types,
      characteristics,
      system: {
        difficulty: cur.difficulty ?? SKILL_DIFFICULTIES[0],
        cost: {
          trained: cur.cost?.trained ?? 0,
          plus10: cur.cost?.plus10 ?? 0,
          plus20: cur.cost?.plus20 ?? 0,
        },
        identifier: cur.identifier ?? "",
      },
    };
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const form = this.element.querySelector<HTMLFormElement>("form");
    if (form === null) return;
    const identifierInput = form.querySelector<HTMLInputElement>('[name="system.identifier"]');
    identifierInput?.setCustomValidity(identifierProblemMessage(identifierInput.value.trim()) ?? "");
    if (!form.reportValidity()) return;

    const nameInput = form.querySelector<HTMLInputElement>('[name="name"]');
    const difficultySelect = form.querySelector<HTMLSelectElement>('[name="system.difficulty"]');
    const trainedInput = form.querySelector<HTMLInputElement>('[name="system.cost.trained"]');
    const plus10Input = form.querySelector<HTMLInputElement>('[name="system.cost.plus10"]');
    const plus20Input = form.querySelector<HTMLInputElement>('[name="system.cost.plus20"]');

    const type = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[data-array-field='system.type']:checked"),
    ).map(cb => cb.value) as SkillType[];

    const characteristics = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[data-array-field='system.characteristics']:checked"),
    ).map(cb => cb.value) as CharacteristicId[];

    const definition: ActorSkillDefinition = {
      name: nameInput?.value.trim() ?? "",
      difficulty: (difficultySelect?.value ?? SKILL_DIFFICULTIES[0]) as SkillDifficulty,
      type,
      characteristics,
      description: this.#initial.description ?? "",
      cost: {
        trained: Math.max(0, Math.trunc(Number(trainedInput?.value ?? 0))),
        plus10: Math.max(0, Math.trunc(Number(plus10Input?.value ?? 0))),
        plus20: Math.max(0, Math.trunc(Number(plus20Input?.value ?? 0))),
      },
      identifier: identifierInput?.value.trim() ?? "",
    };

    this.#resolve?.({ action: "save", definition });
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
