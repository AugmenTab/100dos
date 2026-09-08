import { SKILL_DIFFICULTIES, type SkillDifficulty } from "../../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import { type EducationDefinition } from "../../education.js";
import { type EducationSkill } from "../../items/education.js";
import { type SkillData } from "../../items/skill.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export type ActorEducationDialogResult =
  | { action: "save"; definition: EducationDefinition }
  | { action: "cancel" };

type DialogMode = "create" | "edit";

export class ActorEducationDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  readonly #mode: DialogMode;
  readonly #initial: Partial<EducationDefinition>;
  #skills: EducationSkill[];
  #resolve: ((result: ActorEducationDialogResult) => void) | null;

  static async promptCreate(): Promise<ActorEducationDialogResult> {
    return new Promise(resolve => {
      const dialog = new ActorEducationDialog("create", {}, [], resolve);
      void dialog.render(true);
    });
  }

  static async promptEdit(
    identifier: string,
    education: Omit<EducationDefinition, "identifier">,
  ): Promise<ActorEducationDialogResult> {
    return new Promise(resolve => {
      const dialog = new ActorEducationDialog(
        "edit",
        { ...education, identifier },
        education.skills.map(s => ({ identifier: s.identifier, name: s.name })),
        resolve,
      );
      void dialog.render(true);
    });
  }

  constructor(
    mode: DialogMode,
    initial: Partial<EducationDefinition>,
    skills: EducationSkill[],
    resolve: (result: ActorEducationDialogResult) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#mode = mode;
    this.#initial = initial;
    this.#skills = skills;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "actor-education-dialog"],
    position: { width: 400 },
    window: { title: "DOS100.actorEducation.dialog.createTitle" },
    actions: {
      saveAndClose: ActorEducationDialog.prototype._onSaveAndClose,
      cancelDialog: ActorEducationDialog.prototype._onCancelDialog,
      deleteEducationSkill: ActorEducationDialog.prototype._onDeleteEducationSkill,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/actors/dialogs/actor-education.hbs" },
  };

  get title(): string {
    const key = this.#mode === "create"
      ? "DOS100.actorEducation.dialog.createTitle"
      : "DOS100.actorEducation.dialog.editTitle";
    return game.i18n.localize(key);
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const cur = this.#initial;

    const difficulties = SKILL_DIFFICULTIES.map(d => ({
      value: d,
      label: game.i18n.localize(`DOS100.skills.difficulty.${d}`),
      selected: (cur.difficulty ?? SKILL_DIFFICULTIES[0]) === d,
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
      characteristics,
      skills: this.#skills,
      system: {
        difficulty: cur.difficulty ?? SKILL_DIFFICULTIES[0],
        cost: {
          plus5: cur.cost?.plus5 ?? 0,
          plus10: cur.cost?.plus10 ?? 0,
        },
        identifier: cur.identifier ?? "",
      },
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);

    const dd = new foundry.applications.ux.DragDrop.implementation({
      dropSelector: null,
      permissions: { drop: () => true },
      callbacks: { drop: (e: DragEvent) => { void this.#handleDrop(e); } },
    });
    dd.bind(this.element);
  }

  override _onDrop(event: DragEvent): void | Promise<void> {
    return this.#handleDrop(event);
  }

  async #handleDrop(event: DragEvent): Promise<void> {
    const raw = event.dataTransfer?.getData("text/plain");
    if (!raw) return;
    let dropData: { type?: string; uuid?: string };
    try { dropData = JSON.parse(raw) as { type?: string; uuid?: string }; } catch { return; }
    if (dropData.type !== "Item" || dropData.uuid === undefined) return;
    const dropped = await fromUuid<Item>(dropData.uuid);
    if (dropped === null || dropped.type !== "skill") return;
    const skillSys = dropped.system as SkillData;
    if (!skillSys.identifier) {
      ui.notifications?.warn(game.i18n.localize("DOS100.actorSkill.notification.noIdentifier"));
      return;
    }
    if (this.#skills.some(s => s.identifier === skillSys.identifier)) {
      ui.notifications?.warn(
        game.i18n.format("DOS100.education.notification.duplicateSkill", { identifier: skillSys.identifier }),
      );
      return;
    }
    this.#skills = [...this.#skills, { identifier: skillSys.identifier, name: dropped.name ?? "" }];
    await this.render();
  }

  protected async _onDeleteEducationSkill(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const index = Number(target.dataset.index);
    this.#skills = this.#skills.filter((_, i) => i !== index);
    await this.render();
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const form = this.element.querySelector<HTMLFormElement>("form");
    if (form === null) return;
    if (!form.reportValidity()) return;

    const nameInput = form.querySelector<HTMLInputElement>('[name="name"]');
    const difficultySelect = form.querySelector<HTMLSelectElement>('[name="system.difficulty"]');
    const plus5Input = form.querySelector<HTMLInputElement>('[name="system.cost.plus5"]');
    const plus10Input = form.querySelector<HTMLInputElement>('[name="system.cost.plus10"]');
    const identifierInput = form.querySelector<HTMLInputElement>('[name="system.identifier"]');

    const characteristics = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[data-array-field='system.characteristics']:checked"),
    ).map(cb => cb.value) as CharacteristicId[];

    const definition: EducationDefinition = {
      name: nameInput?.value.trim() ?? "",
      difficulty: (difficultySelect?.value ?? SKILL_DIFFICULTIES[0]) as SkillDifficulty,
      characteristics,
      skills: [...this.#skills],
      description: this.#initial.description ?? "",
      cost: {
        plus5: Math.max(0, Math.trunc(Number(plus5Input?.value ?? 0))),
        plus10: Math.max(0, Math.trunc(Number(plus10Input?.value ?? 0))),
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
