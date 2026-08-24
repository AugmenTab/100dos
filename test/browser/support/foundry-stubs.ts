// Narrow runtime stand-ins for the ambient Foundry globals that
// src/module/handlebars-helpers.ts references — game.i18n.lang and
// foundry.utils.escapeHTML. Importing this module (for its side effects,
// before anything that calls registerHandlebarsHelpers()) is the harness's
// entire Foundry compatibility surface for helper registration; it does
// not implement any Foundry document/application/lifecycle behavior.
import Handlebars from "handlebars";

(globalThis as unknown as { Handlebars: typeof Handlebars }).Handlebars = Handlebars;

(globalThis as unknown as { game: { i18n: { lang: string } } }).game = {
  i18n: { lang: "en" },
};

(globalThis as unknown as { foundry: { utils: { escapeHTML(value: unknown): string } } }).foundry = {
  utils: {
    escapeHTML(value: unknown): string {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
  },
};
