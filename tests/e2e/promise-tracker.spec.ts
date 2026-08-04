import { expect, test } from "@playwright/test";

/**
 * Promise Tracker lifecycle: create → status update → extend → escalate →
 * fine → lock/unlock → delete, plus audit-log verification.
 */
const unique = `E2E ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test("creates a promise", async ({ page }) => {
  await page.goto("/promise-tracker/create");
  await page.getByLabel("Promise title").fill(unique);
  await page.getByRole("combobox").first().click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Owner").fill("E2E Owner");
  await page.getByLabel("Receiver").fill("E2E Receiver");
  const deadline = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  await page.locator('input[type="datetime-local"]').fill(deadline);
  await page.getByRole("button", { name: /create|activate|save/i }).first().click();
  await expect(page.getByText(unique).first()).toBeVisible();
});

test("filters, updates status, extends, escalates, locks and deletes", async ({ page }) => {
  await page.goto("/promise-tracker/all");
  await page.getByPlaceholder(/search/i).fill(unique);
  const row = page.getByRole("row").filter({ hasText: unique }).first();
  await expect(row).toBeVisible();

  const openMenu = async () => {
    await row.getByRole("button", { name: /actions/i }).click();
  };

  await openMenu();
  await page.getByRole("menuitem", { name: "Extend deadline 24h" }).click();
  await openMenu();
  await page.getByRole("menuitem", { name: "Escalate one level" }).click();
  await openMenu();
  await page.getByRole("menuitem", { name: "Flag delayed" }).click();
  await expect(row.getByText(/delayed/i).first()).toBeVisible();

  await openMenu();
  await page.getByRole("menuitem", { name: "Mark broken" }).click();
  await page.goto("/promise-tracker/broken");
  await page.getByPlaceholder(/search/i).fill(unique);
  const brokenRecord = page.locator("div").filter({ hasText: unique }).filter({ hasText: /Fine applied/ }).last();
  await brokenRecord.getByRole("button", { name: "Apply fine" }).click();
  const fineDialog = page.getByRole("dialog");
  await fineDialog.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  const fineBase = fineDialog.getByLabel("Base value for percentage");
  if (await fineBase.isVisible()) await fineBase.fill("10000");
  await fineDialog.getByRole("button", { name: "Apply fine" }).click();
  await expect(page.getByText(/Fine applied:/).last()).not.toContainText("₹0");

  await page.goto("/promise-tracker/all");
  await page.getByPlaceholder(/search/i).fill(unique);
  const updatedRow = page.getByRole("row").filter({ hasText: unique }).first();
  const openUpdatedMenu = async () => {
    await updatedRow.getByRole("button", { name: /actions/i }).click();
  };
  await openUpdatedMenu();
  await page.getByRole("menuitem", { name: "Mark fulfilled" }).click();
  await page.goto("/promise-tracker/fulfilled");
  await page.getByPlaceholder(/search/i).fill(unique);
  const fulfilledRecord = page.locator("div").filter({ hasText: unique }).filter({ hasText: /Tip released/ }).last();
  await fulfilledRecord.getByRole("button", { name: "Release tip" }).click();
  const tipDialog = page.getByRole("dialog");
  await tipDialog.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  const tipBase = tipDialog.getByLabel("Base value for percentage");
  if (await tipBase.isVisible()) await tipBase.fill("10000");
  await tipDialog.getByRole("button", { name: "Release tip" }).click();
  await expect(page.getByText(/Tip released:/).last()).not.toContainText("₹0");

  await page.goto("/promise-tracker/all");
  await page.getByPlaceholder(/search/i).fill(unique);
  const finalRow = page.getByRole("row").filter({ hasText: unique }).first();
  const openFinalMenu = async () => {
    await finalRow.getByRole("button", { name: /actions/i }).click();
  };

  await openFinalMenu();
  await page.getByRole("menuitem", { name: /Unlock record/ }).click();
  await openFinalMenu();
  await page.getByRole("menuitem", { name: /Lock record/ }).click();
  await openFinalMenu();
  await page.getByRole("menuitem", { name: /Unlock record/ }).click();

  await openFinalMenu();
  await page.getByRole("menuitem", { name: "Delete promise" }).click();
  await expect(page.getByRole("row").filter({ hasText: unique })).toHaveCount(0);
});

test("writes the lifecycle to the audit log", async ({ page }) => {
  await page.goto("/promise-tracker/audit-logs");
  await expect(page.getByText(/Promise Created|Deadline Extended|Promise Deleted/).first()).toBeVisible();
});

test("realtime indicator reports a connection state", async ({ page }) => {
  await page.goto("/promise-tracker");
  const pill = page.getByTestId("realtime-status");
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute("data-status", /live|connecting|reconnecting|offline/);
});

test("settings exposes system health monitoring", async ({ page }) => {
  await page.goto("/promise-tracker/settings");
  await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
});
