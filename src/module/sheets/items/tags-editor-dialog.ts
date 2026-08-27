import { Dos100Item } from "../../documents/item.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class TagsEditorDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #tags: string[];
  #dragIndex: number | null = null;

  constructor(item: Dos100Item, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#item = item;
    this.#tags = [...(item.system as { tags: string[] }).tags];
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "tags-editor-dialog"],
    position: { width: 360 },
    window: { title: "DOS100.item.tagsEditor.title" },
    actions: {
      addTag: TagsEditorDialog.prototype._onAddTag,
      deleteTag: TagsEditorDialog.prototype._onDeleteTag,
      saveAndClose: TagsEditorDialog.prototype._onSaveAndClose,
      cancelDialog: TagsEditorDialog.prototype._onCancelDialog,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/tags-editor.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { tags: [...this.#tags] };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);
    this.element.querySelectorAll<HTMLElement>("li[data-index]").forEach(row => {
      row.addEventListener("dragstart", this._onDragStart.bind(this));
      row.addEventListener("dragover", e => e.preventDefault());
      row.addEventListener("drop", this._onDrop.bind(this));
    });
  }

  private _captureInputValues(): void {
    const inputs = this.element.querySelectorAll<HTMLInputElement>("li[data-index] > input");
    this.#tags = Array.from(inputs).map(input => input.value);
  }

  private _onDragStart(event: DragEvent): void {
    if ((event.target as Element).closest("input")) {
      event.preventDefault();
      return;
    }
    const row = event.currentTarget as HTMLElement;
    this.#dragIndex = Number(row.dataset.index);
    event.dataTransfer?.setData("text/plain", String(this.#dragIndex));
  }

  private _onDrop(event: DragEvent): void {
    event.preventDefault();
    const targetIndex = Number((event.currentTarget as HTMLElement).dataset.index);
    if (this.#dragIndex === null || this.#dragIndex === targetIndex) return;
    this._captureInputValues();
    const [moved] = this.#tags.splice(this.#dragIndex, 1);
    this.#tags.splice(targetIndex, 0, moved!);
    this.#dragIndex = null;
    void this.render();
  }

  protected async _onAddTag(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this._captureInputValues();
    this.#tags.push("");
    await this.render();
  }

  protected async _onDeleteTag(_event: PointerEvent, target: HTMLElement): Promise<void> {
    this._captureInputValues();
    const index = Number(target.dataset.index);
    this.#tags.splice(index, 1);
    await this.render();
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this._captureInputValues();
    const tags = this.#tags.filter(t => t.trim().length > 0);
    await this.#item.update({ "system.tags": tags });
    await this.close();
  }

  protected async _onCancelDialog(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.close();
  }
}
