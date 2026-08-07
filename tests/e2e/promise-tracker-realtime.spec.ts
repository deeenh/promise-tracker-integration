import { expect, test } from "@playwright/test";

/**
 * Realtime resilience: when the Supabase realtime socket cannot be reached the
 * header pill must surface a user-visible error state with a Retry control, and
 * the subscription must recover (back to "live") once the socket works again.
 */
const REALTIME_URL = "**/realtime/v1/websocket**";

test.describe.configure({ mode: "serial" });

test("shows a user-visible error state when the realtime socket fails", async ({ page }) => {
  // Fail every realtime socket handshake: the client sees CHANNEL_ERROR/CLOSED.
  await page.routeWebSocket(REALTIME_URL, (ws) => ws.close({ code: 1011 }));

  await page.goto("/promise-tracker");

  const pill = page.getByTestId("realtime-status");
  await expect(pill).toBeVisible();

  // First failure → reconnecting, then it degrades to the offline error state.
  await expect(pill).toHaveAttribute("data-status", /reconnecting|offline/, { timeout: 20_000 });
  await expect(pill).toHaveAttribute("data-status", "offline", { timeout: 30_000 });
  await expect(pill).toContainText(/Live updates offline/i);
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("records the realtime failure in system health", async ({ page }) => {
  await page.routeWebSocket(REALTIME_URL, (ws) => ws.close({ code: 1011 }));
  await page.goto("/promise-tracker");
  await expect(page.getByTestId("realtime-status")).toHaveAttribute("data-status", "offline", {
    timeout: 30_000,
  });

  // Health events are written through the REST API, so they survive the socket outage.
  await page.goto("/promise-tracker/settings");
  await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
  await expect(page.getByText(/subscription_lost/).first()).toBeVisible({ timeout: 20_000 });
});

test("reconnects gracefully once realtime is reachable again", async ({ page }) => {
  let blocked = true;
  await page.routeWebSocket(REALTIME_URL, (ws) => {
    if (blocked) {
      ws.close({ code: 1011 });
      return;
    }
    ws.connectToServer();
  });

  await page.goto("/promise-tracker");
  const pill = page.getByTestId("realtime-status");
  await expect(pill).toHaveAttribute("data-status", "offline", { timeout: 30_000 });

  blocked = false;
  await page.getByRole("button", { name: "Retry" }).click();

  await expect(pill).toHaveAttribute("data-status", "live", { timeout: 30_000 });
  await expect(pill).toContainText(/Live/);
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
});

test("automatically retries without user interaction", async ({ page }) => {
  let failures = 0;
  await page.routeWebSocket(REALTIME_URL, (ws) => {
    failures += 1;
    if (failures <= 2) {
      ws.close({ code: 1011 });
      return;
    }
    ws.connectToServer();
  });

  await page.goto("/promise-tracker");
  const pill = page.getByTestId("realtime-status");
  await expect(pill).toHaveAttribute("data-status", /reconnecting|offline/, { timeout: 20_000 });
  // Exponential backoff should recover on its own once the socket succeeds.
  await expect(pill).toHaveAttribute("data-status", "live", { timeout: 45_000 });
  expect(failures).toBeGreaterThan(1);
});
