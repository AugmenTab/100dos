import { SKILL_DIFFICULTIES, SKILL_TYPES, type SkillType } from "../../skill.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import { type SkillData } from "../../items/skill.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class SkillItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "item", "skill"],
    position: { width: 480, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
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
    body: { template: "systems/100dos/templates/items/skill-shell.hbs", scrollable: [".dos100-item-tab-panels"] },
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const item = this.item;
    const sys = item.system as SkillData;

    const difficulties = SKILL_DIFFICULTIES.map(d => ({
      value: d,
      label: game.i18n.localize(`DOS100.skills.difficulty.${d}`),
      selected: sys.difficulty === d,
    }));

    const types = SKILL_TYPES.map(t => ({
      value: t,
      label: game.i18n.localize(`DOS100.skills.type.${t}`),
      checked: sys.kinds.includes(t),
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
      types,
      characteristics,
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);
    for (const input of Array.from(this.element.querySelectorAll<HTMLInputElement>("input[name='system.kinds'], input[name='system.characteristics']"))) {
      input.addEventListener("change", async () => {
        const name = input.name as "system.kinds" | "system.characteristics";
        const checked = Array.from(
          this.element.querySelectorAll<HTMLInputElement>(`input[name='${name}']:checked`),
        ).map(el => el.value) as SkillType[] | CharacteristicId[];
        await this.item.update({ [name]: checked });
      });
    }
  }

}
