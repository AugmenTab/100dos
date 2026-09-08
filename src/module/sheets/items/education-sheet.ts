import { SKILL_DIFFICULTIES } from "../../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import { type EducationData, type EducationSkill } from "../../items/education.js";
import { type SkillData } from "../../items/skill.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class EducationItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "education"],
    position: { width: 480, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      deleteEducationSkill: EducationItemSheet.prototype._onDeleteEducationSkill,
    },
  };

  static override TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "DOS100.item.tabs.description" },
        { id: "details", label: "DOS100.item.tabs.details" },
      ],
    },
  };

  static override PARTS = {
    body: { template: "systems/100dos/templates/items/education-shell.hbs", scrollable: [".dos100-item-tab-panels"] },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const item = this.item;
    const sys = item.system as EducationData;

    const difficulties = SKILL_DIFFICULTIES.map(d => ({
      value: d,
      label: game.i18n.localize(`DOS100.skills.difficulty.${d}`),
      selected: sys.difficulty === d,
    }));

    const characteristics = CHARACTERISTIC_IDS.map(id => ({
      value: id,
      label: game.i18n.localize(`DOS100.characteristic.${id}.abbr`),
      checked: sys.characteristics.includes(id),
    }));

    return {
      ...await super._prepareContext(options),
      item,
      sheetId: this.id,
      tabs: { primary: this._prepareTabs("primary") },
      system: sys,
      difficulties,
      characteristics,
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);

    for (const input of Array.from(
      this.element.querySelectorAll<HTMLInputElement>("input[name='system.characteristics']"),
    )) {
      input.addEventListener("change", async () => {
        const checked = Array.from(
          this.element.querySelectorAll<HTMLInputElement>("input[name='system.characteristics']:checked"),
        ).map(el => el.value) as CharacteristicId[];
        await this.item.update({ "system.characteristics": checked });
      });
    }

    const dd = new foundry.applications.ux.DragDrop.implementation({
      dropSelector: null,
      permissions: { drop: () => true },
      callbacks: { drop: (e: DragEvent) => { void this._onDrop(e); } },
    });
    dd.bind(this.element);
  }

  override _onDrop(event: DragEvent): void | Promise<void> {
    return (async () => {
      if (this.element.querySelector('[data-tab="details"].active') === null) return;
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
      const sys = this.item.system as EducationData;
      if (sys.skills.some(s => s.identifier === skillSys.identifier)) {
        ui.notifications?.warn(
          game.i18n.format("DOS100.education.notification.duplicateSkill", { identifier: skillSys.identifier }),
        );
        return;
      }
      const newSkill: EducationSkill = {
        identifier: skillSys.identifier,
        name: dropped.name ?? "",
      };
      await this.item.update({ "system.skills": [...sys.skills, newSkill] });
    })();
  }

  protected async _onDeleteEducationSkill(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const index = Number(target.dataset.index);
    const sys = this.item.system as EducationData;
    const updated = sys.skills.filter((_, i) => i !== index);
    await this.item.update({ "system.skills": updated });
  }
}
