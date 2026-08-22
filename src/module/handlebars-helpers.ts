// Lazily built and cached per language, matching Foundry's own idiom for
// this exact problem (Localization#getListFormatter's `#formatters[key]
// ??= new Intl.ListFormat(...)`) — constructing an Intl.NumberFormat is
// comparatively expensive, and game.i18n.lang can't change without a full
// page reload (the "core.language" client setting is requiresReload:
// true), so there's never a stale entry to invalidate.
const numberFormatsByLanguage = new Map<string, Intl.NumberFormat>();

function localizedNumberFormat(): Intl.NumberFormat {
  const lang = game.i18n.lang;
  let format = numberFormatsByLanguage.get(lang);
  if (format === undefined) {
    format = new Intl.NumberFormat(lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    numberFormatsByLanguage.set(lang, format);
  }
  return format;
}

export function registerHandlebarsHelpers(): void {
  // Generic string-join helper for building a localization key from a fixed
  // prefix plus a dynamic document/schema key, e.g.
  // {{localize (concat "DOS100.characteristic." @key ".abbr")}}. Handlebars
  // has no built-in equivalent. The last argument is always the Handlebars
  // options hash, not part of the string.
  Handlebars.registerHelper("concat", (...args: unknown[]) => {
    args.pop();
    return args.join("");
  });

  // Region-aware number display (thousands separators, decimal marks, etc.),
  // keyed off Foundry's own configured interface language rather than the
  // system's registered "numberFormat" helper (fixed decimals/sign, no
  // grouping — a different job, and reusing its name would overwrite the
  // global registration Foundry's own templates rely on). Capped at 2
  // fraction digits so values like Movement speeds, which may carry
  // decimals, don't spill full floating-point precision into the UI;
  // whole numbers are unaffected since none is required.
  Handlebars.registerHelper("localizeNumber", (value: unknown) => localizedNumberFormat().format(Number(value)));

  // Builds a fixed-length array of booleans for a dot/pip progress display,
  // e.g. {{#each (filledPips this.advancement 5)}} — the first `filled`
  // entries are true. Handlebars has no numeric range/loop-counter helper.
  Handlebars.registerHelper("filledPips", (filled: unknown, total: unknown) => {
    const filledCount = Number(filled);
    return Array.from({ length: Number(total) }, (_, i) => i < filledCount);
  });

  // Strict-equality comparison for template conditionals, e.g.
  // {{#if (eq actor.system.movement.mode "land")}} — Handlebars' {{#if}} has
  // no built-in comparison operator.
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

  // Numeric greater-than comparison, e.g. {{#if (gt this.item.system.quantity 1)}}.
  Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));

  // Builds the Contribution breakdown as an HTML string for Foundry's native
  // data-tooltip-html attribute, written directly onto whatever element is
  // actually hovered/clicked at each call site (a <button> in the
  // Characteristics grid can't reliably forward pointer events to a nested
  // element carrying the attribute, so it has to live on the real element).
  // Returned as a plain string, not a SafeString: Handlebars' default
  // attribute-context escaping is what makes this round-trip correctly
  // through the browser's own attribute parsing back into real markup once
  // TooltipManager reads it.
  Handlebars.registerHelper(
    "contributionTooltipHtml",
    (label: unknown, value: unknown, contributions: unknown) => {
      const esc = foundry.utils.escapeHTML;
      const rows = (contributions as { label: unknown; value: unknown }[])
        .map(
          (contribution) =>
            `<div class="dos100-tooltip-row">` +
            `<span class="dos100-tooltip-row-label">${esc(contribution.label)}</span>` +
            `<span class="dos100-tooltip-row-value">${esc(contribution.value)}</span>` +
            `</div>`,
        )
        .join("");
      return (
        `<div class="dos100-tooltip">` +
        `<div class="dos100-tooltip-header">` +
        `<span class="dos100-tooltip-header-label">${esc(label)}</span>` +
        `<span class="dos100-tooltip-header-value">${esc(value)}</span>` +
        `</div>` +
        rows +
        `</div>`
      );
    },
  );
}
