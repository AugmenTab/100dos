import { type CharacteristicId, isCharacteristicId } from "../../characteristic.js";
import { moveAdvanceUpdate, unusedAdvanceCharacteristics } from "../../advances.js";
import { type BodyLocation } from "../../body-location.js";
import { AbstractItemSheet } from "./abstract-item-sheet.js";
import { BaseCharacteristicsDialog } from "./base-characteristics-dialog.js";
import { BaseMythicCharacteristicsDialog } from "./base-mythic-characteristics-dialog.js";
import { BodyLocationDialog } from "./body-location-dialog.js";
import { type CompositionSystem, type FoundationMode, compositionContext } from "./composition-context.js";

// The shared sheet for the character-composition Item types (Template,
// Race, Soldier Type): AbstractItemSheet's layout, tabs, Changes, and Links
// unchanged, plus the composition Details fields — the Advances table for
// all three, and the foundational-property editors for Race (required) and
// Soldier Type (each optional). Concrete sheets only choose their mode.
export abstract class CompositionItemSheet extends AbstractItemSheet {
  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    actions: {
      addAdvance: CompositionItemSheet.prototype._onAddAdvance,
      deleteAdvance: CompositionItemSheet.prototype._onDeleteAdvance,
      editBaseCharacteristics: CompositionItemSheet.prototype._onEditBaseCharacteristics,
      deleteBaseCharacteristics: CompositionItemSheet.prototype._onDeleteBaseCharacteristics,
      editBaseMythicCharacteristics: CompositionItemSheet.prototype._onEditBaseMythicCharacteristics,
      deleteBaseMythicCharacteristics: CompositionItemSheet.prototype._onDeleteBaseMythicCharacteristics,
      addBodyLocation: CompositionItemSheet.prototype._onAddBodyLocation,
      editBodyLocation: CompositionItemSheet.prototype._onEditBodyLocation,
      deleteBodyLocation: CompositionItemSheet.prototype._onDeleteBodyLocation,
      removeBodyLocations: CompositionItemSheet.prototype._onRemoveBodyLocations,
    },
  };

  protected abstract get _foundationMode(): FoundationMode;

  protected override get _typeDetailsPartial(): string | null {
    return "systems/100dos/templates/items/composition-details-fields.hbs";
  }

  private get compositionSystem(): CompositionSystem {
    return this.item.system as CompositionSystem;
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...(await super._prepareContext(options)),
      composition: compositionContext(this.compositionSystem, this._foundationMode),
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);
    // A row's Characteristic selector has no `name`: changing it moves the
    // row's count to another Characteristic, which a plain field submit
    // can't express. The row's Advances selector is an ordinary field.
    for (const select of Array.from(this.element.querySelectorAll<HTMLSelectElement>("select[data-advance-row]"))) {
      select.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        void this._onMoveAdvance(select);
      });
    }
  }

  private async _onMoveAdvance(select: HTMLSelectElement): Promise<void> {
    const from = select.dataset.advanceRow;
    const to = select.value;
    if (!from || !isCharacteristicId(from) || !isCharacteristicId(to)) return;
    const update = moveAdvanceUpdate(this.compositionSystem.advances, from, to);
    if (update === null) {
      select.value = from;
      return;
    }
    await this.item.update({ "system.advances": update });
  }

  // A new row takes the first Characteristic without an entry, at Simple.
  protected async _onAddAdvance(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const [id] = unusedAdvanceCharacteristics(this.compositionSystem.advances);
    if (!id) return;
    await this.item.update({ [`system.advances.${id}`]: 1 });
  }

  // Deleting a row resets its count to zero — the same as no entry at all.
  protected async _onDeleteAdvance(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const id = target.dataset.characteristic as CharacteristicId | undefined;
    if (!id || !isCharacteristicId(id)) return;
    await this.item.update({ [`system.advances.${id}`]: 0 });
  }

  // Add and Edit are the same modal: blank inputs when there is no lineup
  // yet, the current values otherwise. Cancel changes nothing.
  protected async _onEditBaseCharacteristics(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const result = await BaseCharacteristicsDialog.prompt(this.compositionSystem.baseCharacteristics ?? null);
    if (result === null) return;
    await this.item.update({ "system.baseCharacteristics": result });
  }

  // Only an optional (Soldier Type) lineup can be cleared back to null; a
  // Race's required lineup has no Delete control.
  protected async _onDeleteBaseCharacteristics(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    if (this._foundationMode !== "optional") return;
    await this.item.update({ "system.baseCharacteristics": null });
  }

  protected async _onEditBaseMythicCharacteristics(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const result = await BaseMythicCharacteristicsDialog.prompt(this.compositionSystem.baseMythicCharacteristics ?? null);
    if (result === null) return;
    await this.item.update({ "system.baseMythicCharacteristics": result });
  }

  protected async _onDeleteBaseMythicCharacteristics(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.item.update({ "system.baseMythicCharacteristics": null });
  }

  // On a Soldier Type with no anatomy yet, adding the first location
  // creates the collection.
  protected async _onAddBodyLocation(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const locations = this.compositionSystem.bodyLocations ?? null;
    const result = await BodyLocationDialog.promptAdd(new Set(Object.keys(locations ?? {})));
    if (result === null) return;
    if (locations === null) {
      await this.item.update({ "system.bodyLocations": { [result.identifier]: result.location } });
    } else {
      await this.item.update({ [`system.bodyLocations.${result.identifier}`]: result.location });
    }
  }

  protected async _onEditBodyLocation(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const identifier = target.dataset.identifier;
    const existing: BodyLocation | undefined = identifier ? this.compositionSystem.bodyLocations?.[identifier] : undefined;
    if (!identifier || !existing) return;
    const result = await BodyLocationDialog.promptEdit(identifier, existing);
    if (result === null) return;
    await this.item.update({ [`system.bodyLocations.${identifier}`]: result.location });
  }

  // Removing a Soldier Type's last location restores null rather than
  // leaving an empty (and gameplay-invalid) anatomy; a Race keeps its
  // required collection, empty, until it is authored again.
  protected async _onDeleteBodyLocation(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const identifier = target.dataset.identifier;
    const locations = this.compositionSystem.bodyLocations ?? null;
    if (!identifier || locations === null || !(identifier in locations)) return;
    const remaining = Object.keys(locations).filter((key) => key !== identifier);
    if (remaining.length === 0 && this._foundationMode === "optional") {
      await this.item.update({ "system.bodyLocations": null });
      return;
    }
    await this.item.update({ "system.bodyLocations": { [identifier]: new foundry.data.operators.ForcedDeletion() } });
  }

  protected async _onRemoveBodyLocations(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    if (this._foundationMode !== "optional") return;
    await this.item.update({ "system.bodyLocations": null });
  }
}
