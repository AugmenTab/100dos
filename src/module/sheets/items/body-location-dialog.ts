import {
  BODY_LOCATION_TYPES,
  LOCATION_PLACEMENTS,
  type BodyLocation,
  type BodyLocationType,
  type LocationPlacement,
} from "../../body-location.js";
import { identifierProblemMessage } from "../../identifier.js";
import { PromptDialog } from "../prompt-dialog.js";

export type BodyLocationDialogResult = { identifier: string; location: BodyLocation } | null;

// Adds or edits one Body Location. A new location's identifier is entered
// here and validated like every other identifier (allowed characters, not a
// reserved Characteristic ID) plus uniqueness within its collection. When
// editing, the identifier is shown read-only: it is the location's stable
// key, so editing the label or any other property can never move it.
// Resolves the saved location with its identifier, or null on cancel.
export class BodyLocationDialog extends PromptDialog<BodyLocationDialogResult> {
  protected override readonly cancelResult: BodyLocationDialogResult = null;
  readonly #identifier: string | null;
  readonly #initial: BodyLocation | null;
  readonly #taken: ReadonlySet<string>;

  static async promptAdd(taken: ReadonlySet<string>): Promise<BodyLocationDialogResult> {
    return new BodyLocationDialog(null, null, taken).wait();
  }

  static async promptEdit(identifier: string, location: BodyLocation): Promise<BodyLocationDialogResult> {
    return new BodyLocationDialog(identifier, location, new Set()).wait();
  }

  constructor(
    identifier: string | null,
    initial: BodyLocation | null,
    taken: ReadonlySet<string>,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#identifier = identifier;
    this.#initial = initial;
    this.#taken = taken;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "foundation-dialog", "body-location-dialog"],
    position: { width: 380 },
    window: { title: "DOS100.foundation.bodyLocations.addTitle" },
    actions: {
      saveAndClose: BodyLocationDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/body-location.hbs" },
  };

  get title(): string {
    return game.i18n.localize(
      this.#identifier === null
        ? "DOS100.foundation.bodyLocations.addTitle"
        : "DOS100.foundation.bodyLocations.editTitle",
    );
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = this.#initial ?? { type: "head", label: "", placement: "none", order: 0 };
    return {
      sheetId: this.id,
      editing: this.#identifier !== null,
      identifier: this.#identifier ?? "",
      label: current.label,
      order: current.order,
      types: BODY_LOCATION_TYPES.map((type) => ({
        value: type,
        label: game.i18n.localize(`DOS100.damageResistance.categories.${type}`),
        selected: type === current.type,
      })),
      placements: LOCATION_PLACEMENTS.map((placement) => ({
        value: placement,
        label: game.i18n.localize(`DOS100.foundation.bodyLocations.placements.${placement}`),
        selected: placement === current.placement,
      })),
    };
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const form = this.element.querySelector<HTMLFormElement>("form");
    if (form === null) return;
    const identifierInput = form.querySelector<HTMLInputElement>('[name="identifier"]');
    const identifier = this.#identifier ?? identifierInput?.value.trim() ?? "";
    if (this.#identifier === null && identifierInput) {
      const problem =
        identifier === ""
          ? ""
          : (identifierProblemMessage(identifier) ??
            (this.#taken.has(identifier)
              ? game.i18n.format("DOS100.foundation.bodyLocations.duplicate", { identifier })
              : ""));
      identifierInput.setCustomValidity(problem);
    }
    if (!form.reportValidity()) return;

    const order = Math.trunc(Number(form.querySelector<HTMLInputElement>('[name="order"]')?.value ?? 0));
    const location: BodyLocation = {
      type: (form.querySelector<HTMLSelectElement>('[name="type"]')?.value ?? "head") as BodyLocationType,
      label: form.querySelector<HTMLInputElement>('[name="label"]')?.value.trim() ?? "",
      placement: (form.querySelector<HTMLSelectElement>('[name="placement"]')?.value ?? "none") as LocationPlacement,
      order: Number.isFinite(order) ? order : 0,
    };
    await this.settle({ identifier, location });
  }
}
