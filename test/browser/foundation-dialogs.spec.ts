// Browser-tier coverage for the foundational-property modals' rendered
// forms. Their contexts mirror each dialog's _prepareContext (see
// src/module/sheets/items/*-dialog.ts); submit, validation, and cancel
// behavior need Foundry's ApplicationV2 and are e2e.
import { expect, test } from "@playwright/test";
import { renderPage } from "./support/render.js";
import { CHARACTERISTIC_IDS } from "../../src/module/characteristic.js";
import { MYTHIC_CHARACTERISTIC_IDS } from "../../src/module/base-mythic-characteristics.js";
import { BODY_LOCATION_TYPES, LOCATION_PLACEMENTS } from "../../src/module/body-location.js";

const ABBR: Record<string, string> = { str: "STR", tou: "TOU", agi: "AGI", wfr: "WFR", wfm: "WFM", int: "INT", per: "PER", crg: "CRG", cha: "CHA", ldr: "LDR" };
const FULL: Record<string, string> = { str: "Strength", tou: "Toughness", agi: "Agility" };

test("the Base Characteristics modal requires all ten whole-number inputs, blank when adding", async ({ page }) => {
  const context = {
    sheetId: "browser-dialog",
    characteristics: CHARACTERISTIC_IDS.map((id) => ({ id, abbr: ABBR[id], full: id, value: "" })),
  };
  await page.setContent(renderPage("items/dialogs/base-characteristics.hbs", context));

  const inputs = page.locator('input[type="number"]');
  await expect(inputs).toHaveCount(10);
  for (const id of CHARACTERISTIC_IDS) {
    const input = page.locator(`input[name="${id}"]`);
    await expect(input).toHaveValue("");
    await expect(input).toHaveAttribute("required", "");
    await expect(input).toHaveAttribute("min", "0");
    await expect(input).toHaveAttribute("step", "1");
  }
  await expect(page.locator(".eyebrow-label")).toHaveText(CHARACTERISTIC_IDS.map((id) => ABBR[id]!));
  // Native constraint validation rejects the untouched form, so ten blanks
  // can never stand in for a completed lineup.
  expect(await page.locator("form").evaluate((form) => (form as HTMLFormElement).checkValidity())).toBe(false);
  await expect(page.locator('button[data-action="saveAndClose"]')).toBeVisible();
  await expect(page.locator('button[data-action="cancelDialog"]')).toBeVisible();
});

test("the Base Mythic Characteristics modal pairs each value with a Present control; absent inputs are disabled", async ({ page }) => {
  const values: Record<string, number | null> = { str: 2, tou: null, agi: 0 };
  const context = {
    sheetId: "browser-dialog",
    characteristics: MYTHIC_CHARACTERISTIC_IDS.map((id) => ({
      id,
      full: `Mythic ${FULL[id]}`,
      present: values[id] !== null,
      value: values[id] === null ? "" : String(values[id]),
    })),
  };
  await page.setContent(renderPage("items/dialogs/base-mythic-characteristics.hbs", context));

  await expect(page.locator("input[data-present-for]")).toHaveCount(3);
  await expect(page.locator('input[data-present-for="str"]')).toBeChecked();
  await expect(page.locator('input[data-present-for="tou"]')).not.toBeChecked();
  await expect(page.locator('input[data-present-for="agi"]')).toBeChecked();
  await expect(page.locator('input[name="tou"]')).toBeDisabled();
  await expect(page.locator('input[name="agi"]')).toHaveValue("0");
  await expect(page.locator('input[name="agi"]')).toBeEnabled();
  await expect(page.getByLabel("Mythic Toughness is present")).toBeVisible();
});

function bodyLocationContext(editing: boolean) {
  return {
    sheetId: "browser-dialog",
    editing,
    identifier: editing ? "leftWing" : "",
    label: editing ? "Left Wing" : "",
    order: 0,
    types: BODY_LOCATION_TYPES.map((type) => ({ value: type, label: type, selected: type === (editing ? "wing" : "head") })),
    placements: LOCATION_PLACEMENTS.map((placement) => ({ value: placement, label: placement, selected: placement === (editing ? "left" : "none") })),
  };
}

test("the Body Location modal has every anatomical field; a new identifier is required", async ({ page }) => {
  await page.setContent(renderPage("items/dialogs/body-location.hbs", bodyLocationContext(false)));
  for (const name of ["identifier", "label", "type", "placement", "order"]) {
    await expect(page.locator(`[name="${name}"]`)).toBeVisible();
  }
  await expect(page.locator('select[name="type"] option')).toHaveCount(6);
  await expect(page.locator('select[name="placement"] option')).toHaveCount(3);
  await expect(page.locator('input[name="identifier"]')).toHaveAttribute("required", "");
  await expect(page.locator('input[name="identifier"]')).not.toHaveAttribute("readonly", "");
});

test("editing a Body Location shows its identifier read-only, so it can't change by accident", async ({ page }) => {
  await page.setContent(renderPage("items/dialogs/body-location.hbs", bodyLocationContext(true)));
  const identifier = page.locator('input[name="identifier"]');
  await expect(identifier).toHaveValue("leftWing");
  await expect(identifier).toHaveAttribute("readonly", "");
  await expect(page.locator('input[name="label"]')).toHaveValue("Left Wing");
  await expect(page.locator('select[name="type"] option:checked')).toHaveText("wing");
  await expect(page.locator('select[name="placement"] option:checked')).toHaveText("left");
});
