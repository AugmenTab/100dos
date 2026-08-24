import Handlebars from "handlebars";
import "./foundry-stubs.js";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { registerHandlebarsHelpers } from "../../../src/module/handlebars-helpers.js";

const distDir = resolve(process.cwd(), "dist");
const templatesDir = join(distDir, "templates");

const en = JSON.parse(readFileSync(join(distDir, "lang/en.json"), "utf8")) as unknown;
const productionCss = readFileSync(join(distDir, "styles/100dos.css"), "utf8");

function lookupLangValue(key: string): string {
  let value: unknown = en;
  for (const part of key.split(".")) value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== "string") throw new Error(`Missing lang key: ${key}`);
  return value;
}

function formatLangString(str: string, data?: Record<string, unknown>): string {
  if (!data) return str;
  return str.replace(/\{(\w+)\}/g, (match, token: string) => (token in data ? String(data[token]) : match));
}

let helpersRegistered = false;

/**
 * Registers 100DOS's own production Handlebars helpers (the real
 * implementation from src/module/handlebars-helpers.ts, not a re-typed
 * copy — this is what keeps the lightweight tier honest about drift) plus
 * narrow stand-ins for the two Foundry-core-provided helpers production
 * templates also rely on (localize, numberFormat). Both stand-ins were
 * written against Foundry core's documented behavior, confirmed by reading
 * resources/app/client/applications/handlebars.mjs directly, not guessed.
 */
function ensureHelpersRegistered(): void {
  if (helpersRegistered) return;
  helpersRegistered = true;
  registerHandlebarsHelpers();

  Handlebars.registerHelper("localize", (value: unknown, options: Handlebars.HelperOptions) => {
    const key = value instanceof Handlebars.SafeString ? value.toString() : String(value);
    const hash = options.hash as Record<string, unknown> | undefined;
    const hasData = hash !== undefined && Object.keys(hash).length > 0;
    return formatLangString(lookupLangValue(key), hasData ? hash : undefined);
  });

  Handlebars.registerHelper("numberFormat", (value: unknown, options: Handlebars.HelperOptions) => {
    const decimals = (options.hash.decimals as number | undefined) ?? 0;
    const sign = (options.hash.sign as boolean | undefined) ?? false;
    const num = typeof value === "string" || value === null || value === undefined ? parseFloat(String(value)) : Number(value);
    const formatted = Number.isNaN(num) ? "NaN" : num.toFixed(decimals);
    return new Handlebars.SafeString(sign && num >= 0 ? `+${formatted}` : formatted);
  });

  // The remaining Foundry-core inline comparison/logic helpers (see
  // resources/app/client/applications/handlebars.mjs's initialize()) — the
  // real implementations are one-liners operating on `arguments`, matched
  // exactly. `or`/`and` drop the trailing Handlebars options-hash argument
  // before evaluating, same as core does.
  Handlebars.registerHelper("ne", (v1: unknown, v2: unknown) => v1 !== v2);
  Handlebars.registerHelper("lt", (v1: unknown, v2: unknown) => (v1 as number) < (v2 as number));
  Handlebars.registerHelper("lte", (v1: unknown, v2: unknown) => (v1 as number) <= (v2 as number));
  Handlebars.registerHelper("gte", (v1: unknown, v2: unknown) => (v1 as number) >= (v2 as number));
  Handlebars.registerHelper("not", (pred: unknown) => !pred);
  Handlebars.registerHelper("and", function (this: unknown, ...args: unknown[]) {
    return args.slice(0, -1).every(Boolean);
  });
  Handlebars.registerHelper("or", function (this: unknown, ...args: unknown[]) {
    return args.slice(0, -1).some(Boolean);
  });

  // Narrow stand-in for Foundry core's selectOptions (see
  // resources/app/client/applications/handlebars.mjs) — the real
  // implementation delegates to foundry.applications.fields.
  // createSelectInput for grouping/sorting/localizing options, none of
  // which any migrated test's assertions depend on (option-list content
  // is exactly the kind of thing that stayed in real-Foundry — see the
  // classification notes). This only needs to emit valid, non-crashing
  // <option> markup with the right value selected so the surrounding row
  // still renders; it does not need full parity with the real helper.
  Handlebars.registerHelper("selectOptions", (choices: unknown, options: Handlebars.HelperOptions) => {
    const hash = options.hash as { selected?: unknown; blank?: string };
    const entries: { value: unknown; label: unknown }[] = Array.isArray(choices)
      ? choices.map((c) => (typeof c === "object" && c !== null ? (c as { value: unknown; label: unknown }) : { value: c, label: c }))
      : Object.entries((choices ?? {}) as Record<string, unknown>).map(([value, label]) => ({ value, label }));
    let html = hash.blank !== undefined ? `<option value="">${hash.blank}</option>` : "";
    for (const entry of entries) {
      const isSelected = String(entry.value) === String(hash.selected);
      html += `<option value="${String(entry.value)}"${isSelected ? " selected" : ""}>${String(entry.label)}</option>`;
    }
    return new Handlebars.SafeString(html);
  });
}

const registeredPartials = new Set<string>();

/** relativePath is relative to dist/templates/, e.g. "items/shell/description-tab.hbs". */
function registerPartial(relativePath: string): void {
  if (registeredPartials.has(relativePath)) return;
  registeredPartials.add(relativePath);
  const src = readFileSync(join(templatesDir, relativePath), "utf8");
  Handlebars.registerPartial(`systems/100dos/templates/${relativePath}`, src);
}

const compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();

/** relativePath is relative to dist/templates/, e.g. "actors/pc/dashboard.hbs". */
function compileTemplate(relativePath: string): HandlebarsTemplateDelegate {
  ensureHelpersRegistered();
  let compiled = compiledTemplates.get(relativePath);
  if (!compiled) {
    const src = readFileSync(join(templatesDir, relativePath), "utf8");
    compiled = Handlebars.compile(src);
    compiledTemplates.set(relativePath, compiled);
  }
  return compiled;
}

export type RenderOptions = {
  /** Partial paths relative to dist/templates/, registered before compiling. */
  partials?: string[];
  /**
   * Ancestor class(es) the template's own CSS selectors are scoped under
   * (e.g. "pc-sheet-body" — see pc-shell.less's file comment: its rules
   * are written as `.pc-sheet-body .foo`, matching the real sheet's
   * wrapping div, not a class this template applies to itself). Without
   * this, ancestor-scoped rules simply never match and elements silently
   * fall back to plain block layout — confirmed the hard way via a failed
   * grid-layout assertion, not assumed up front.
   */
  wrapperClass?: string;
};

/**
 * Compiles and renders one real production template (relative to
 * dist/templates/) against a hand-built context object, wrapping the
 * result in a minimal HTML document with the real compiled 100dos.css
 * inlined so page.setContent() needs no server/file/baseURL. No Foundry
 * world, client, or Application is booted — that is the entire point of
 * this tier, and the harness must never grow to reimplement one.
 */
export function renderPage(templateRelativePath: string, context: Record<string, unknown>, options: RenderOptions = {}): string {
  for (const partial of options.partials ?? []) registerPartial(partial);
  const template = compileTemplate(templateRelativePath);
  const rendered = template(context);
  const body = options.wrapperClass ? `<div class="${options.wrapperClass}">${rendered}</div>` : rendered;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${productionCss}</style>
<style>body { margin: 0; padding: 1rem; font-family: sans-serif; }</style>
</head>
<body class="application">
${body}
</body>
</html>`;
}
