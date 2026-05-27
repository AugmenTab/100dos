# Localization

Localization files live in `src/lang/`. The build copies them to `dist/lang/` unchanged. Each file is registered in `static/system.json` under the `languages` array.

## Key conventions

The localization file has two top-level sections with different casing rules.

### `TYPES` (uppercase)

This section is owned by Foundry core. Foundry looks up document type labels at `TYPES.Actor.<type>` and `TYPES.Item.<type>` automatically — for example, in the Actors directory and type selector UI. The uppercase key and capitalized `Actor`/`Item` sub-keys are required by that lookup path, not a style choice.

```json
"TYPES": {
  "Actor": { "pc": "PC", "npc": "NPC", "vehicle": "Vehicle" },
  "Item": { "equipment": "Equipment" }
}
```

Type identifier sub-keys (`pc`, `npc`, etc.) are lowercase because they mirror the type strings defined in `system.json`.

### `DOS100` (system namespace, camelCase)

Everything the system owns lives under `DOS100`. Sub-keys use camelCase throughout. We deliberately avoid PascalCase here to signal that capitalization within this namespace carries no meaning — it does not reflect Foundry class names or any other external contract. Consistent camelCase removes that ambiguity.

```json
"DOS100": {
  "actor": { "name": "Name" },
  "setting": {
    "debugMode": {
      "name": "Debug Mode",
      "hint": "..."
    }
  }
}
```

Structure keys loosely by document type or feature area (`actor`, `item`, `setting`). Add keys only when they are used — do not pre-populate keys for future use.

## Using localization keys

**In Handlebars templates**, use the `localize` helper:

```hbs
<input placeholder="{{localize 'DOS100.actor.name'}}" />
<span>{{localize "TYPES.Actor.pc"}}</span>
```

**In JavaScript/TypeScript**, pass the key string directly to Foundry APIs that localize automatically (e.g., `game.settings.register` `name`/`hint` fields). Call `game.i18n.localize()` explicitly only when you need the translated string at runtime.
