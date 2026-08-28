import { Dos100Item, ABSTRACT_ITEM_TYPES } from "../../documents/item.js";
import { type ActionData, USAGE_PERIODS } from "../../items/action.js";
import { type ChangeData, type ConditionalChangeData, type ChangeTarget, type ConditionalNoteTarget } from "../../change.js";
import { resolveTargetLabel, type ActorContext } from "../../change-targets.js";
import { ChangeEditorDialog } from "./change-editor-dialog.js";
import { TagsEditorDialog } from "./tags-editor-dialog.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

// Reusable shell for Item types representing capabilities/features rather
// than physical inventory objects — header + sidebar + tab navigation, per
// .local/plan.md's "Abstract Item Sheet Shell". Armor/Gear/Ammunition/
// Effect/Trait stay on ItemSheetV2 directly; only concrete abstract types
// (Ability, and later ones) extend this.
export abstract class AbstractItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    classes: ["dos100", "sheet", "item"],
    position: { width: 800, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      addAction: AbstractItemSheet.prototype._onAddAction,
      duplicateAction: AbstractItemSheet.prototype._onDuplicateAction,
      deleteAction: AbstractItemSheet.prototype._onDeleteAction,
      addChange: AbstractItemSheet.prototype._onAddChange,
      editChange: AbstractItemSheet.prototype._onEditChange,
      duplicateChange: AbstractItemSheet.prototype._onDuplicateChange,
      deleteChange: AbstractItemSheet.prototype._onDeleteChange,
      addConditional: AbstractItemSheet.prototype._onAddConditional,
      editConditional: AbstractItemSheet.prototype._onEditConditional,
      duplicateConditional: AbstractItemSheet.prototype._onDuplicateConditional,
      deleteConditional: AbstractItemSheet.prototype._onDeleteConditional,
      addEffectNote: AbstractItemSheet.prototype._onAddEffectNote,
      deleteEffectNote: AbstractItemSheet.prototype._onDeleteEffectNote,
      addFootnote: AbstractItemSheet.prototype._onAddFootnote,
      deleteFootnote: AbstractItemSheet.prototype._onDeleteFootnote,
      openLinkedItem: AbstractItemSheet.prototype._onOpenLinkedItem,
      deleteLinkedItem: AbstractItemSheet.prototype._onDeleteLinkedItem,
      editTags: AbstractItemSheet.prototype._onEditTags,
    },
  };

  static override TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "DOS100.item.tabs.description" },
        { id: "details", label: "DOS100.item.tabs.details" },
        { id: "changes", label: "DOS100.item.tabs.changes" },
        { id: "links", label: "DOS100.item.tabs.links" },
      ],
    },
    links: {
      initial: "children",
      tabs: [
        { id: "children", label: "DOS100.item.links.children.label" },
        { id: "supplements", label: "DOS100.item.links.supplements.label" },
      ],
    },
  };

  protected get _showCombatTab(): boolean {
    return false;
  }

  protected get _typeDetailsPartial(): string | null {
    return null;
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const item = this.item as Dos100Item;
    const sysId = game.system.id;
    const childIds = (item.getFlag(sysId, "childItemIds") as string[] | undefined) ?? [];
    const supplementIds = (item.getFlag(sysId, "supplementItemIds") as string[] | undefined) ?? [];
    const toRow = (id: string) => {
      const granted = item.actor?.items.get(id) as Dos100Item | undefined;
      return granted ? { id: granted.id, name: granted.name, img: granted.img } : null;
    };
    const grantingItem = item.grantingItem;
    const grantSource = grantingItem
      ? { name: grantingItem.name, typeLabel: game.i18n.localize(`TYPES.Item.${grantingItem.type}`) }
      : null;
    const sysWithChanges = item.system as {
      changes?: { computed: { id: string; enabled: boolean; target: string; mode: string; formula: string; source: { id: string; name: string } }[]; conditional: { id: string; enabled: boolean; target: string; value: string; source: { id: string; name: string } }[] };
    };
    const actor = item.actor as ActorContext;
    const localize = (key: string) => game.i18n.localize(key);
    const resolvedChanges = (sysWithChanges.changes?.computed ?? []).map(c => ({
      ...c,
      targetLabel: resolveTargetLabel(c.target, localize, actor),
    }));
    const resolvedConditionals = (sysWithChanges.changes?.conditional ?? []).map(c => ({
      ...c,
      targetLabel: resolveTargetLabel(c.target, localize, actor),
    }));
    return {
      ...await super._prepareContext(options),
      item,
      sheetId: this.id,
      tabs: {
        primary: this._prepareTabs("primary"),
        links: this._prepareTabs("links"),
      },
      // Sourced from the Item's own type, not hard-coded — reuses Foundry's
      // own auto-registered TYPES.Item.<type> label (see system.json's
      // documentTypes.Item and en.json's TYPES.Item block) rather than a
      // second, duplicate DOS100.<type>.name key.
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      showCombatTab: this._showCombatTab,
      typeDetailsPartial: this._typeDetailsPartial,
      grantSource,
      usagePeriods: USAGE_PERIODS,
      childItems: childIds.flatMap(id => { const r = toRow(id); return r ? [r] : []; }),
      supplementItems: supplementIds.flatMap(id => { const r = toRow(id); return r ? [r] : []; }),
      resolvedChanges,
      resolvedConditionals,
    };
  }

  protected async _onAddAction(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const id = foundry.utils.randomID();
    await item.update({
      [`system.actions.items.${id}`]: {
        id,
        name: game.i18n.localize("DOS100.item.actions.new"),
        activation: { type: "passive", cost: null },
        uses: { per: "unlimited", value: 0, max: 0, cost: 1, formula: { max: "", cost: "" } },
      },
    });
  }

  protected async _onDuplicateAction(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { actions: { items: Record<string, ActionData> } };
    const sourceId = target.dataset.identifier;
    if (!sourceId) return;
    const source = system.actions.items[sourceId];
    if (!source) return;
    const newId = foundry.utils.randomID();
    await item.update({
      [`system.actions.items.${newId}`]: { ...source, id: newId, name: `${source.name} (Copy)` },
    });
  }

  protected async _onDeleteAction(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const id = target.dataset.identifier;
    if (!id) return;
    await item.update({ [`system.actions.items.-=${id}`]: null });
  }

  protected async _onAddChange(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const defaultData: ChangeData = {
      id: foundry.utils.randomID(),
      enabled: true,
      target: "" as ChangeTarget,
      mode: "add",
      formula: "",
      source: { id: item.id, name: item.name ?? "" },
    };
    const result = await ChangeEditorDialog.promptChange(
      defaultData,
      "DOS100.item.changeEditor.title.addChange",
      item.actor as ActorContext,
    );
    if (!result) return;
    await item.update({ "system.changes.computed": [...system.changes.computed, result] });
  }

  protected async _onEditChange(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const id = target.dataset.identifier;
    const existing = system.changes.computed.find(c => c.id === id);
    if (!existing) return;
    const result = await ChangeEditorDialog.promptChange(
      existing,
      "DOS100.item.changeEditor.title.editChange",
      item.actor as ActorContext,
    );
    if (!result) return;
    await item.update({
      "system.changes.computed": system.changes.computed.map(c => (c.id === id ? result : c)),
    });
  }

  protected async _onAddConditional(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const defaultData: ConditionalChangeData = {
      id: foundry.utils.randomID(),
      enabled: true,
      target: "" as ConditionalNoteTarget,
      value: "",
      source: { id: item.id, name: item.name ?? "" },
    };
    const result = await ChangeEditorDialog.promptConditional(
      defaultData,
      "DOS100.item.changeEditor.title.addConditional",
      item.actor as ActorContext,
    );
    if (!result) return;
    await item.update({ "system.changes.conditional": [...system.changes.conditional, result] });
  }

  protected async _onEditConditional(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const id = target.dataset.identifier;
    const existing = system.changes.conditional.find(c => c.id === id);
    if (!existing) return;
    const result = await ChangeEditorDialog.promptConditional(
      existing,
      "DOS100.item.changeEditor.title.editConditional",
      item.actor as ActorContext,
    );
    if (!result) return;
    await item.update({
      "system.changes.conditional": system.changes.conditional.map(c => (c.id === id ? result : c)),
    });
  }

  protected async _onDuplicateChange(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const sourceId = target.dataset.identifier;
    const source = system.changes.computed.find(c => c.id === sourceId);
    if (!source) return;
    const copy: ChangeData = { ...source, id: foundry.utils.randomID() };
    await item.update({ "system.changes.computed": [...system.changes.computed, copy] });
  }

  protected async _onDeleteChange(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const id = target.dataset.identifier;
    await item.update({ "system.changes.computed": system.changes.computed.filter(c => c.id !== id) });
  }

  protected async _onDuplicateConditional(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const sourceId = target.dataset.identifier;
    const source = system.changes.conditional.find(c => c.id === sourceId);
    if (!source) return;
    const copy: ConditionalChangeData = { ...source, id: foundry.utils.randomID() };
    await item.update({ "system.changes.conditional": [...system.changes.conditional, copy] });
  }

  protected async _onDeleteConditional(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { changes: { computed: ChangeData[]; conditional: ConditionalChangeData[] } };
    const id = target.dataset.identifier;
    await item.update({ "system.changes.conditional": system.changes.conditional.filter(c => c.id !== id) });
  }

  protected async _onAddEffectNote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { actions: { notes: { effectNotes: string[]; footnotes: string[] } } };
    await item.update({ "system.actions.notes.effectNotes": [...system.actions.notes.effectNotes, ""] });
  }

  protected async _onDeleteEffectNote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { actions: { notes: { effectNotes: string[]; footnotes: string[] } } };
    const index = Number(target.dataset.identifier);
    await item.update({ "system.actions.notes.effectNotes": system.actions.notes.effectNotes.filter((_, i) => i !== index) });
  }

  protected async _onAddFootnote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { actions: { notes: { effectNotes: string[]; footnotes: string[] } } };
    await item.update({ "system.actions.notes.footnotes": [...system.actions.notes.footnotes, ""] });
  }

  protected async _onDeleteFootnote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const system = item.system as { actions: { notes: { effectNotes: string[]; footnotes: string[] } } };
    const index = Number(target.dataset.identifier);
    await item.update({ "system.actions.notes.footnotes": system.actions.notes.footnotes.filter((_, i) => i !== index) });
  }

  protected async _onOpenLinkedItem(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const id = target.dataset.identifier;
    if (!id || !item.actor) return;
    const linked = item.actor.items.get(id) as Dos100Item | undefined;
    linked?.sheet?.render(true);
  }

  protected async _onEditTags(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    try {
      const dialog = new TagsEditorDialog(this.item as Dos100Item);
      await dialog.render(true);
    } catch (err) {
      ui.notifications?.error(String(err));
    }
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);
    this.element
      .querySelectorAll<HTMLElement>("section[data-group='links'][data-tab]")
      .forEach(section => {
        section.addEventListener("dragenter", e => {
          e.preventDefault();
          section.classList.add("drop-target");
        });
        section.addEventListener("dragover", e => {
          e.preventDefault();
        });
        section.addEventListener("dragleave", e => {
          if (!section.contains(e.relatedTarget as Node)) {
            section.classList.remove("drop-target");
          }
        });
        section.addEventListener("drop", e => {
          section.classList.remove("drop-target");
          void this._onDropLink(e as DragEvent, section);
        });
      });
  }

  protected async _onDropLink(event: DragEvent, section: HTMLElement): Promise<void> {
    const raw = event.dataTransfer?.getData("text/plain");
    if (!raw) return;
    let dropData: { type?: string; uuid?: string };
    try {
      dropData = JSON.parse(raw) as { type?: string; uuid?: string };
    } catch {
      return;
    }
    if (dropData.type !== "Item" || !dropData.uuid) return;

    const item = this.item as Dos100Item;
    if (!item.actor) return;

    const source = await fromUuid<Item>(dropData.uuid);
    if (!source || !ABSTRACT_ITEM_TYPES.has(source.type)) return;
    if (source.id === item.id) return;

    const sysId = game.system.id;
    const tab = section.dataset.tab;
    if (tab !== "children" && tab !== "supplements") return;

    const isFromSameActor = source.actor?.id === item.actor.id;
    let grantedId: string;

    if (isFromSameActor) {
      grantedId = source.id;
      await source.setFlag(sysId, "grantedBy", item.id);
    } else {
      const [created] = await item.actor.createEmbeddedDocuments("Item", [
        { ...source.toObject(), flags: { [sysId]: { grantedBy: item.id } } },
      ]);
      if (!created) return;
      grantedId = created.id;
    }

    const flagKey = tab === "children" ? "childItemIds" : "supplementItemIds";
    const current = (item.getFlag(sysId, flagKey) as string[] | undefined) ?? [];
    if (!current.includes(grantedId)) {
      await item.setFlag(sysId, flagKey, [...current, grantedId]);
    }
  }

  protected async _onDeleteLinkedItem(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.item as Dos100Item;
    const id = target.dataset.identifier;
    if (!id || !item.actor) return;
    const sysId = game.system.id;
    const childIds = (item.getFlag(sysId, "childItemIds") as string[] | undefined) ?? [];
    const supplementIds = (item.getFlag(sysId, "supplementItemIds") as string[] | undefined) ?? [];
    await Promise.all([
      item.setFlag(sysId, "childItemIds", childIds.filter(i => i !== id)),
      item.setFlag(sysId, "supplementItemIds", supplementIds.filter(i => i !== id)),
      item.actor.deleteEmbeddedDocuments("Item", [id]),
    ]);
  }
}
