const { HandlebarsApplicationMixin } = foundry.applications.api;

// Shared lifecycle for a dialog that answers one question: wait() renders it
// and returns a promise for the answer, settle() delivers an answer and
// closes, and closing any other way — the cancelDialog action, the window's
// own close control, Escape — delivers cancelResult instead. Exactly one
// result is ever delivered.
//
// cancelDialog is registered here once; Foundry merges `actions` across the
// DEFAULT_OPTIONS of every class in the inheritance chain, so subclasses
// list only their own actions.
export abstract class PromptDialog<TResult> extends HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  #resolve: ((result: TResult) => void) | null = null;

  protected abstract readonly cancelResult: TResult;

  static override DEFAULT_OPTIONS: Record<string, unknown> = {
    actions: {
      cancelDialog: PromptDialog.prototype._onCancelDialog,
    },
  };

  wait(): Promise<TResult> {
    return new Promise((resolve) => {
      this.#resolve = resolve;
      void this.render(true);
    });
  }

  protected async settle(result: TResult): Promise<void> {
    this.#resolve?.(result);
    this.#resolve = null;
    await this.close();
  }

  protected async _onCancelDialog(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    await this.close();
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    this.#resolve?.(this.cancelResult);
    this.#resolve = null;
    return super.close(options);
  }
}
