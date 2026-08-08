import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

/**
 * Regression coverage for the filter/search fixes (UI-001/002/003) and the
 * deterministic CSV export schema (UI-005) on the main Promise Tracker routes.
 */

const PROMISE_CSV_HEADER =
  "code,title,category,sub_category,owner,receiver,status,priority,deadline,escalation_level,fine_amount,tip_amount";
const AUDIT_CSV_HEADER = "timestamp,action,promise_code,actor,actor_role,details";

test.describe.configure({ mode: "serial" });

async function gotoRegister(page: Page, path: string) {
  const loaded = page.waitForResponse(
    (response) => response.url().includes("/rest/v1/promises") && response.status() === 200,
  );
  await page.goto(path);
  await loaded;
  await expect(page.getByLabel("Search promises")).toBeVisible();
}

async function selectOption(page: Page, triggerLabel: string, optionName: string | RegExp) {
  await page.getByLabel(triggerLabel).click();
  await page.getByRole("option", { name: optionName }).first().click();
}

/** Number of body rows currently rendered in the register table. */
async function rowCount(page: Page) {
  if (await page.getByText(/No promises found|No promises match/i).first().isVisible()) return 0;
  return page.locator("tbody tr").count();
}

async function downloadCsv(page: Page, buttonName: RegExp) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: buttonName }).first().click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  return {
    filename: download.suggestedFilename(),
    text: await readFile(path!, "utf8"),
  };
}

test("search narrows the register and clears back to the full list", async ({ page }) => {
  await gotoRegister(page, "/promise-tracker/all");

  const total = await rowCount(page);
  expect(total).toBeGreaterThan(0);

  const firstCode = (await page.locator("tbody tr td").first().innerText()).trim();
  await page.getByLabel("Search promises").fill(firstCode);
  await expect
    .poll(async () => rowCount(page), { timeout: 10_000 })
    .toBeLessThanOrEqual(total);
  await expect(page.locator("tbody tr").filter({ hasText: firstCode }).first()).toBeVisible();

  // Nonsense query must yield an explicit empty state, never a silent full list.
  await page.getByLabel("Search promises").fill("zzz-no-such-promise-zzz");
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBe(0);

  await page.getByLabel("Search promises").fill("");
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBe(total);
});

test("status, category and SLA filters constrain the rows they claim to", async ({ page }) => {
  await gotoRegister(page, "/promise-tracker/all");
  const total = await rowCount(page);

  await selectOption(page, "Filter by status", /^fulfilled$/i);
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBeLessThanOrEqual(total);
  for (const row of await page.locator("tbody tr").all()) {
    await expect(row).toContainText(/fulfilled/i);
  }

  await selectOption(page, "Filter by status", /All statuses/i);
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBe(total);

  // UI-001: an SLA window must never pass rows outside the window through.
  await selectOption(page, "Filter by SLA window", /overdue/i);
  const overdue = await rowCount(page);
  expect(overdue).toBeLessThanOrEqual(total);
  for (const row of await page.locator("tbody tr").all()) {
    await expect(row).toContainText(/overdue/i);
  }

  await selectOption(page, "Filter by SLA window", /24|next day|day/i);
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBeLessThanOrEqual(total);
  for (const row of await page.locator("tbody tr").all()) {
    await expect(row).not.toContainText(/overdue/i);
  }
});

test("advanced filter panel exposes its state and combines with search", async ({ page }) => {
  await gotoRegister(page, "/promise-tracker/all");

  // UI-002/003: toggle state is announced and focus moves into the panel.
  const toggle = page.getByRole("button", { name: /More filters/i });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const panelId = await toggle.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("group", { name: "Additional promise filters" });
  await expect(panel).toBeVisible();
  await expect(panel.locator(":focus")).toHaveCount(1);

  const total = await rowCount(page);
  await selectOption(page, "Filter by lock state", /unlocked only/i);
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBeLessThanOrEqual(total);

  await page.getByRole("button", { name: /clear|reset/i }).first().click();
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBe(total);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("CSV export uses the fixed schema and honours the active filters", async ({ page }) => {
  await gotoRegister(page, "/promise-tracker/all");

  const full = await downloadCsv(page, /Export CSV/i);
  expect(full.filename).toMatch(/^all-promises-\d{4}-\d{2}-\d{2}\.csv$/);
  const fullLines = full.text.trim().split("\n");
  expect(fullLines[0]).toBe(PROMISE_CSV_HEADER);
  expect(fullLines.length - 1).toBe(await rowCount(page));
  // UI-005: every row carries the full column set, even when fields are blank.
  for (const line of fullLines.slice(1)) {
    expect(line.match(/","/g)?.length).toBe(PROMISE_CSV_HEADER.split(",").length - 1);
  }

  const firstCode = (await page.locator("tbody tr td").first().innerText()).trim();
  await page.getByLabel("Search promises").fill(firstCode);
  await expect.poll(async () => rowCount(page), { timeout: 10_000 }).toBeGreaterThan(0);

  const filtered = await downloadCsv(page, /Export CSV/i);
  const filteredLines = filtered.text.trim().split("\n");
  expect(filteredLines[0]).toBe(PROMISE_CSV_HEADER);
  expect(filteredLines.length - 1).toBe(await rowCount(page));
  expect(filtered.text).toContain(firstCode);
});

test("status routes filter and export independently", async ({ page }) => {
  await gotoRegister(page, "/promise-tracker/active");
  for (const row of await page.locator("tbody tr").all()) {
    await expect(row).toContainText(/active|pending/i);
  }

  if ((await rowCount(page)) > 0) {
    const active = await downloadCsv(page, /Export CSV/i);
    expect(active.filename).toMatch(/^active-promises-/);
    expect(active.text.trim().split("\n")[0]).toBe(PROMISE_CSV_HEADER);
  }

  await gotoRegister(page, "/promise-tracker/fulfilled");
  for (const row of await page.locator("tbody tr").all()) {
    await expect(row).toContainText(/fulfilled/i);
  }
});

test("audit log search and export keep their own fixed schema", async ({ page }) => {
  await page.goto("/promise-tracker/audit-logs");
  const search = page.getByPlaceholder(/Search action, promise code/i);
  await expect(search).toBeVisible();
  await expect.poll(async () => page.locator("tbody tr").count(), { timeout: 15_000 }).toBeGreaterThan(0);

  const logs = await downloadCsv(page, /Export CSV/i);
  expect(logs.filename).toMatch(/^promise-audit-logs-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(logs.text.trim().split("\n")[0]).toBe(AUDIT_CSV_HEADER);

  await search.fill("zzz-no-such-action-zzz");
  await expect(page.getByText(/No log entries match this search/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
});
