// Types for the runtime stand-ins foundry-stubs.ts installs: the only
// Foundry globals src/module/handlebars-helpers.ts references. Kept in step
// with that file. Handlebars itself is the real npm package here, typed by
// its own declarations, so src/types/foundry.d.ts (whose Handlebars global
// collides with them) is deliberately not part of this tier's tsconfig.

declare const game: {
  i18n: { lang: string };
};

declare const foundry: {
  utils: { escapeHTML(value: unknown): string };
};
