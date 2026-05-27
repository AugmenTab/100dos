export abstract class Dos100ActorSheet extends ActorSheet {
  static override get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      classes: ["dos100", "sheet", "actor"],
      width: 720,
      height: 680,
      resizable: true,
    };
  }

  override async getData(): Promise<Record<string, unknown>> {
    const data = await super.getData();
    return { ...data, actor: this.actor };
  }
}
