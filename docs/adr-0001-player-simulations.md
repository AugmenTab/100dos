# ADR 0001: Player simulations

- **Status:** Accepted
- **Date:** 2026-11-26
- **Where:** `test/simulations/`, the `simulations` project in `playwright.config.ts`

## Context

The system already has three test tiers:

- **Vitest unit tests** cover pure logic: cost math, sorting, validation, schema composition.
- **Browser-tier Playwright tests** cover rendering: one template, one hand-built context, no Foundry.
- **E2E Playwright tests** cover one behavior each against a live Foundry: a handler opens a dialog, a field persists, a drop creates an Item.

Each tier is good at its job, and between them every piece is tested. What none of them tests is whether the pieces work **together, in the order a person uses them**. An E2E test reaches its starting state through the API (`resetFixtures`, `updateItem`, `actor.sheet.render()`) so that it can check one thing fast. That's exactly right for a feature test, and it means no test ever does the whole job a player does: open the sidebar, create the character, drag a Race onto it, buy a Skill, check the XP ledger.

The gaps that hurt players live between features:
- A world Ability can't carry linked Traits, because Links only accept drops on an Item an Actor owns.
- An Action can be given limited uses, but nothing in the UI can set its maximum, so the uses never come back.
- XP purchases land in the ledger, but Spent and Available never move.

Each feature works and passes its own tests. You only see the gap when you play a session.

## Decision

Add a fourth kind of Playwright test: the **player simulation**. A simulation is a scripted journey through one thing players commonly do in a session, such as preparing content, building a character, or playing an encounter. It drives the real Foundry UI, from the sidebar onward, exactly as a person at the table would.

### Technique

**One test per journey, one step per beat.** A simulation is a single Playwright test whose body is a sequence of `table.beat("…", …)` calls. Each beat is a `test.step`, so the HTML report and the trace show the journey as a list of plain-English beats ("pick a Race by dragging it onto the sheet") with each one's actions beneath it.

**Player gestures only.** A beat does what a player does with a mouse and keyboard:
- clicking the sidebar's Create Item or Create Actor;
- opening a sheet by clicking its directory entry;
- typing into a field and leaving it;
- choosing from a select;
- dragging an entry from the sidebar onto a sheet with Playwright's real mouse drag, which fires Chromium's native HTML5 drag events, so Foundry's own `dragstart` builds the payload and the sheet's own drop handler receives it;
- answering a dialog.

`test/simulations/support/table.ts` and `sheets.ts` turn these into verbs (`table.create`, `table.drag`, `pc.acquire`, `sheet.addAction`) so a journey reads like a description of play. Locators prefer what the player reads, such as accessible names like `Edit Power Strike` and `Add Temporary Effect`, over internal structure.

**The API is allowed in three places, and each is marked:**
1. `table.given(…)` and `table.givenCharacter(…)` seed the world a journey *starts from but isn't about*. Building a character in the session-play journey would only repeat the character-building journey. Each appears in the trace as `GIVEN: …`.
2. Assertions read the persisted documents (`table.actor`, `table.worldItem`). A journey checks both what's on screen and what was saved, because a sheet that shows a value it never saved is a bug players hit on the next reload.
3. A beat the harness can't perform through the UI gets a comment saying why. Today there's one: the GM's encounter, since adding a combatant in the Combat Tracker needs a token on the canvas, which the harness disables.

**Pending beats.** Most of what players do every session (every roll, every derived number) doesn't exist yet. Those beats stay in the script, in the order they'd happen, as `table.pending("roll the attack and then its damage", "no roll engine or chat card exists")`. A pending beat:
- adds a `pending beat` annotation, so the report lists what each journey is still missing;
- adds a `PENDING: …` step, so the trace shows where in the session the gap falls.

When the feature lands, the pending call becomes a real beat. A journey is therefore a living script of the whole session and the gap list at the same time.

**Replayable.** The `simulations` project runs with `trace: "on"`, so every run of every journey, passing or failing, leaves a trace. Replay it step by step:

```sh
npx playwright show-trace test-results/<journey>-simulations/trace.zip
```

The trace has a DOM snapshot before and after each action, a filmstrip, network and console. To watch a journey live, run it headed and slowed down:

```sh
SIMULATION_SLOW_MO=500 npx playwright test --project=simulations --headed
```

**Isolation without fixtures.** A journey creates documents through the UI, so they can't carry the E2E fixtures' lane flags. Instead every name a journey uses is lane-prefixed (`table.name("Kara Voss")` gives `[Sim 0] Kara Voss`). That keeps parallel journeys apart in the sidebar, and the `table` fixture deletes everything with its prefix, plus any Combat flagged with its lane, before and after each journey.

**Same harness, same run.** Simulations reuse the E2E worker session, the clean-join check and the diagnostics fixture, which fails a journey on any uncaught page error or 100DOS console error. They run in the same `npx playwright test` as the E2E suite, at a 1920×1080 viewport. A player's desk is that size, and at the 1280×720 default a PC sheet covers the sidebar a journey drags from. The three journeys add about 40s of test time. Run them alone with `--project=simulations`.

### Philosophy

**Test what players do, not what the code does.** Feature tests prove the parts work. Simulations prove the system is usable. The question a simulation answers is "can a player get through a session?", and the only way to answer that is to do what the player does, in order, through the same screen.

**A journey is a specification.** Reading `player-builds-character.sim.ts` tells you how a character gets made in this system today, step by step, and its pending beats tell you what's missing. Product decisions can be argued against it ("should the Race really cost XP through the same prompt as an Ability?"), and changes that break the flow, such as a renamed control or a dialog that stops closing, fail the journey that uses it.

**Keep the unfinished parts visible.** A simulation doesn't skip what isn't built; it writes it down where it belongs. Pending beats keep the journeys honest about how much of a real session the system supports, and they turn "make Spent and Available move" from a line in a status doc into a failing-to-exist beat in the place a player would notice it.

**Few, long, stable.** Simulations are the most expensive tests, so there should be few of them: one per common journey, not one per feature. Each should be long, covering a whole journey, and boring. It shouldn't probe edge cases (that's the E2E tier's job) or check layout (the browser tier's). When a journey fails, the failing beat's title says what a player couldn't do.

## Consequences

- Every common journey now has a script that runs on every test run, and every regression that breaks one fails with a player-level description.
- Gaps between features surface as pending beats or as failing journeys. Writing the first three surfaced two gaps that no feature test catches: Links don't work on world Items, and an Action's maximum uses can't be set.
- Journeys are coupled to the UI, by design. Renaming an accessible label or restructuring a dialog breaks every journey through it. The `sheets.ts` verbs keep that coupling in one place.
- Journeys depend on features in order. A broken early beat, such as creating the PC, hides everything after it. That's acceptable, because a player who can't create a character can't do anything else either.
- The harness itself had to grow: in-page globals for `game.items`, `getName` and `Combat`, a per-project viewport in the worker session, and lane-scoped cleanup by name.

## Journey catalog

Each journey lists its beats, with **(pending)** marking beats the system can't do yet.

### Implemented

**`gm-prepares-content.sim.ts`: the GM prepares content before a session.**
1. Write a Trait with a Change raising Wounds, from the Items directory.
2. Write an Ability with an XP cost, a summary, a once-per-encounter melee attack (activation, uses, attack Characteristic and bonus, damage dice, base and pierce) and a Change to all Characteristic Tests.
3. **(pending)** Link the Trait to the Ability so taking the Ability grants it.
4. Write a three-round Effect with a Change.
5. Reopen each Item and find it as written, on screen and in storage.
6. **(pending)** Set the attack's maximum uses.

**`player-builds-character.sim.ts`: a player builds a character from a blank Actor.**
1. Create a PC from the Actors directory and fill in the basics.
2. Pick a Race by dragging it onto the sheet, skipping its zero XP.
3. Pick a Soldier Type and record its XP.
4. **(pending)** See the Race's Characteristics on the sheet.
5. Add a Skill and train it, recording the XP.
6. Add an Education and raise it to +10, recording the XP.
7. Buy an Ability by dragging it onto the sheet.
8. Pick up a Trait, which costs no XP.
9. Link a copy of the Trait to the owned Ability as its child.
10. Add a Template from Features and name it.
11. Review the XP ledger: one entry per recorded purchase.
12. **(pending)** See XP Spent and Available reflect the purchases.

**`player-plays-session.sim.ts`: a player plays through a combat encounter.**
1. Open the character from the Actors directory.
2. Use Power Strike from Quick Use, spending its one use.
3. **(pending)** Roll the attack and then its damage.
4. Try Power Strike again: a warning, and nothing spent.
5. Take damage by lowering Wounds.
6. Get stunned from the Effects tab.
7. **(pending)** See the stun penalize tests.
8. Gain a temporary Effect and switch it on.
9. The GM runs the encounter to its end, and Power Strike comes back.
10. **(pending)** Make a Skill test.
11. **(pending)** Rest to recover Wounds and Fatigue.

### Designed, to build as their features land

**A player levels up between sessions.** It becomes writable once XP totals and Characteristic derivation exist.
1. The GM awards XP.
2. See Available rise.
3. Raise a Skill from Trained to +10.
4. Raise a Characteristic's Advances.
5. Buy a second Ability.
6. See Spent, Available and the ledger agree.
7. Swap the active Soldier Type, and see the old one's Traits switch off and none of the XP recharged.

**A player gears up.** It needs Armor protection values, Weapons and encumbrance derivation.
1. Drag Armor and a Weapon onto the sheet.
2. Equip the Armor and see Damage Resistance change per location.
3. Carry more than the encumbrance threshold and see the band change.
4. Unequip and drop gear.

**A player fights with a Weapon.** It needs the d100 test, the chat card and attack execution.
1. Attack from a Weapon's Action.
2. See the roll, degrees of success and crit handling in chat.
3. Roll damage against a target's location.
4. Spend ammunition.
5. Apply the hit to the target's Wounds.

**A player takes on a temporary Effect from an Ability.** It needs the Changes engine.
1. Use an Ability that grants an Effect.
2. See the Effect's Changes modify the right Characteristic, with a Contribution in the tooltip.
3. Let the Effect expire after its duration.
4. See it delete itself if it's set to.

**The GM runs an NPC.** It needs the NPC data model.
1. Create an NPC from the Actors directory.
2. Give it a Race and Abilities.
3. Pit it against the PC in an encounter.

Write each one the same way as the implemented journeys. Until its first beats are buildable, its pending beats can live at the end of the nearest implemented journey instead.

## Rules for writing a simulation

- Name the file `<who>-<does-what>.sim.ts` and the test as a sentence about the player.
- Use `table.name(…)` for every document name, so cleanup and lanes work.
- Drive with gestures. Reach for the API only for a `given`, an assertion, or a beat whose comment says why the UI can't do it.
- Wait for every dialog to leave the DOM before opening the next (`toHaveCount(0)`). A closing dialog lingers through its transition.
- Put new verbs in `support/sheets.ts` or `support/table.ts`, not inline, once a second journey needs them.
- Keep a journey a journey. An edge case belongs in an E2E test, and a layout check belongs in a browser test.
