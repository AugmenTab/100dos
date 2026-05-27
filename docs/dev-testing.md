# Development Testing

This document describes how to manually verify the system skeleton using the test world. Manual testing is a temporary measure — as the schema grows, this process will not scale. The intent is to move to automated testing as soon as it becomes feasible.

## Prerequisites

Start the dev environment and open Foundry in a browser:

```bash
scripts/up
```

On the Foundry setup screen, open an existing world running the `100dos` system, or create one if none exists: **Create World → Game System: 100DOS**.

After any rebuild, force-reload the browser (`Ctrl+Shift+R`) to ensure the latest bundle is loaded before running through the checklist.

## Fixture checklist

For each document type below, create a fresh document and run through the verify steps. These steps should be repeated any time a change touches sheet rendering or document registration.

### PC (Actor)

1. Open the Actors Directory and create a new Actor of type **PC**.
2. Verify the sheet opens without errors.
3. Verify the sheet displays the type label **PC**.
4. Enter a name in the name field and submit the form.
5. Verify the name persists after closing and reopening the sheet.

### NPC (Actor)

1. Open the Actors Directory and create a new Actor of type **NPC**.
2. Verify the sheet opens without errors.
3. Verify the sheet displays the type label **NPC**.
4. Enter a name in the name field and submit the form.
5. Verify the name persists after closing and reopening the sheet.

### Vehicle (Actor)

1. Open the Actors Directory and create a new Actor of type **Vehicle**.
2. Verify the sheet opens without errors.
3. Verify the sheet displays the type label **Vehicle**.
4. Enter a name in the name field and submit the form.
5. Verify the name persists after closing and reopening the sheet.

### Equipment (Item)

1. Open the Items Directory and create a new Item of type **Equipment**.
2. Verify the sheet opens without errors.
3. Enter a name in the name field and submit the form.
4. Verify the name persists after closing and reopening the sheet.

## Console errors

After completing the checklist, open the browser developer console and confirm there are no errors or unhandled warnings from the `100dos` system. Warnings from Foundry core or third-party modules can be ignored.

## Maintenance

When a story adds schema fields, add a verify step to the relevant section for each new field. Keep steps minimal — one line per field, checking that it saves and reloads correctly.
