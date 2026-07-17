import { expect, test, type Page, type Route } from "@playwright/test";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const runtimeFailures = new WeakMap<Page, string[]>();
const directNominatimRequests = new WeakMap<Page, string[]>();

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function geocodeProxyResult() {
  return {
    success: true,
    data: {
      label: "Pacific Palisades, Los Angeles, California",
      latitude: 34.0480643,
      longitude: -118.5264706
    },
    meta: { cache: "miss" }
  };
}

async function mockPublicSources(page: Page) {
  await page.route("**/api/geocode", (route) => json(route, geocodeProxyResult()));
  await page.route("**/WFIGS_Incident_Locations_Current/**", (route) => json(route, {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [-118.56095, 34.45412] },
      properties: {
        OBJECTID: 9,
        IncidentName: "MASON",
        UniqueFireIdentifier: "2026-CALAC-228186",
        IncidentSize: 24,
        PercentContained: 15,
        FireDiscoveryDateTime: Date.UTC(2026, 5, 30, 9, 33),
        ModifiedOnDateTime_dt: Date.UTC(2026, 5, 30, 10, 4),
        POOCounty: "Los Angeles",
        POOState: "US-CA",
        POOProtectingAgency: "CAL FIRE"
      }
    }]
  }));
  await page.route("**/api.weather.gov/alerts/active**", (route) => json(route, {
    type: "FeatureCollection",
    features: [{
      properties: {
        event: "Red Flag Warning",
        headline: "Red Flag Warning issued for Los Angeles County",
        severity: "Severe",
        effective: "2026-07-03T18:00:00Z"
      }
    }]
  }));
  await page.route("**/eonet.gsfc.nasa.gov/api/v3/events**", (route) => json(route, {
    events: [{
      id: "EONET_20564",
      title: "SHORE Wildfire",
      description: "Riverside County, California",
      sources: [{ id: "IRWIN", url: "https://irwin.doi.gov/observer/incidents/example" }],
      geometry: [{
        magnitudeValue: 3085,
        magnitudeUnit: "acres",
        date: "2026-06-15T18:24:00Z",
        coordinates: [-117.103582, 33.976656]
      }]
    }]
  }));
  await page.route("**/Palisades_and_Eaton_Dissolved_Fire_Perimeters_as_of_20250121/**", (route) =>
    json(route, { type: "FeatureCollection", features: [] })
  );
  await page.route("**/tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG })
  );
}

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  const nominatimRequests: string[] = [];
  runtimeFailures.set(page, failures);
  directNominatimRequests.set(page, nominatimRequests);
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    if (request.url().includes("nominatim.openstreetmap.org")) nominatimRequests.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console.error: ${message.text()}`);
  });
  await mockPublicSources(page);
});

test.afterEach(async ({ page }) => {
  expect(runtimeFailures.get(page) ?? [], "browser runtime failures").toEqual([]);
  expect(directNominatimRequests.get(page) ?? [], "browser must not contact Nominatim directly").toEqual([]);
});

test("keeps live and historical evidence separate behind a persistent safety boundary", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Current public signals, kept separate/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Official rows become case-scoped household memory/i })).toBeVisible();
  const boundaries = page.getByRole("note", { name: "Emergency guidance boundary" });
  expect(await boundaries.count()).toBeGreaterThanOrEqual(3);
  await expect(boundaries.first()).toContainText("Not current emergency guidance");
  await expect(boundaries.last()).toContainText("follow current local evacuation orders");

  await page.getByRole("button", { name: "Find fires" }).click();
  await expect(page.getByText("MASON", { exact: true })).toBeVisible();
  await expect(page.getByText("Red Flag Warning", { exact: true })).toBeVisible();
  await expect(page.locator(".connector-card", { hasText: "MASON" })).toContainText("Provider updated");
  await expect(page.locator(".live-source-row", { hasText: "NIFC WFIGS" })).toContainText("Checked");
  await expect(page.locator(".live-source-row", { hasText: "NASA FIRMS" })).toContainText("Not checked");
  await expect(page.locator(".live-signal", { hasText: "Red Flag Warning" })).toContainText("Alert effective");
  const liveText = (await page.locator("#connectors").innerText()).toLowerCase();
  expect(liveText).not.toMatch(/recommended route|safest route|leave by|evacuate at|evacuate now/);
  expect(liveText).toContain("does not produce evacuation timing, route advice, or historical detector output");
});

test("associates location privacy, loading, success, and validation errors", async ({ page }) => {
  await page.unroute("**/api/geocode");
  await page.route("**/api/geocode", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await json(route, geocodeProxyResult());
  });
  await page.goto("/");

  const input = page.getByRole("searchbox", { name: "Home base" });
  const submit = page.getByRole("button", { name: "Find fires" });
  await expect(input).toHaveAttribute("aria-describedby", "locationPrivacyHint locationSearchStatus");
  await expect(page.locator("#locationPrivacyHint")).toContainText("Afterlight's same-origin proxy sends that coarse area to OpenStreetMap Nominatim");

  await submit.click();
  await expect(page.getByRole("button", { name: "Checking" })).toBeDisabled();
  await expect(page.locator("#locationSearchStatus")).toHaveAttribute("role", "status");
  await expect(page.locator("#locationSearchStatus")).toContainText("Previous results are hidden");
  await expect(page.locator("#locationSearchStatus")).toContainText("2 current incident records loaded");

  await input.fill("123 Main Street, Pasadena");
  await submit.click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#locationSearchStatus")).toHaveAttribute("role", "alert");
  await expect(page.locator("#locationSearchStatus")).toContainText("not a street address");
});

test("runs judge mode automatically and exposes phase progress", async ({ page }) => {
  await page.goto("/?judge=1");

  const status = page.locator(".cache-meter [role=status]");
  const progress = page.getByRole("progressbar", { name: "Judge replay progress" });
  await expect(status).toContainText("Judge run · thesis");
  await expect(progress).toHaveAttribute("aria-valuenow", /\d+/);
  await expect.poll(async () => Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause" }).click();
  const pausedProgress = Number(await progress.getAttribute("aria-valuenow"));
  await page.waitForTimeout(300);
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBe(pausedProgress);
});

test("makes reduced-motion judge mode static and manually equivalent", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?judge=1");

  await expect(page.locator("#emberCanvas")).toBeHidden();
  const status = page.locator(".cache-meter [role=status]");
  const progress = page.getByRole("progressbar", { name: "Judge replay progress" });
  const next = page.getByRole("button", { name: "Next judge section" });
  await expect(status).toContainText("Judge run · thesis");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");

  const steps = [
    ["official rows", "6"],
    ["memory output", "30"],
    ["evaluation", "36"],
    ["drill output", "41"],
    ["safety boundary", "45"],
    ["thesis", "50"]
  ] as const;
  for (const [phase, percent] of steps) {
    await next.click();
    await expect(status).toContainText(`Judge run · ${phase}`);
    await expect(progress).toHaveAttribute("aria-valuenow", percent);
    if (phase === "drill output") {
      await expect(page.locator("#practice")).toContainText("Judge preview · not saved");
      await expect(page.locator("#practice")).toContainText("Alert checker");
      await expect(page.getByRole("button", { name: "Preview cannot be printed" })).toBeDisabled();
      await expect.poll(async () => {
        const box = await page.locator("#practice").boundingBox();
        return Boolean(box && box.y >= -1 && box.y < (page.viewportSize()?.height ?? 0));
      }).toBe(true);
      await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
      await expect(page.locator(".practice-card")).toBeHidden();
      await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
    }
  }
  await expect(page.locator(".incident-card", { hasText: "Eaton Fire" })).toHaveAttribute("aria-pressed", "true");
});

test("keeps judge mode ephemeral and never exposes or mutates saved household data", async ({ page }) => {
  const savedMemory = JSON.stringify({
    version: 1,
    scenarios: {
      "palisades-2025": {
        confirmedIds: ["palisades-warning-zones"],
        edits: { "palisades-warning-zones": "PRIVATE-MEMORY-SENTINEL" }
      }
    }
  });
  const savedDrill = JSON.stringify({
    version: 1,
    constraints: ["mobility"],
    assignments: {
      "constraint:mobility": {
        ownerRole: "PRIVATE-OWNER-SENTINEL",
        backupRole: "PRIVATE-BACKUP-SENTINEL",
        actionNote: "Equipment handoff plus loading rehearsal",
        practiced: true
      }
    },
    lastPracticedOn: "2026-07-12"
  });
  await page.addInitScript(({ memory, drill }) => {
    localStorage.setItem("afterlight.household-memory.v1", memory);
    localStorage.setItem("afterlight.household-drill.v1", drill);
  }, { memory: savedMemory, drill: savedDrill });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?judge=1");

  await expect(page.locator("body")).not.toContainText("PRIVATE-MEMORY-SENTINEL");
  await expect(page.locator("body")).not.toContainText("PRIVATE-OWNER-SENTINEL");
  await expect(page.locator("#practice").getByRole("checkbox", { name: "Mobility support" })).not.toBeChecked();
  await page.locator("#practice").getByRole("textbox", { name: "Primary owner role for Choose official information channels" }).fill("EPHEMERAL-JUDGE-ROLE");
  await page.locator(".memory-confirm-label input").first().check();
  await page.getByRole("button", { name: "Clear all device memory" }).click();
  await page.getByRole("alertdialog", { name: "Clear all Afterlight device memory?" }).getByRole("button", { name: "Delete all device memory" }).click();

  expect(await page.evaluate(() => localStorage.getItem("afterlight.household-memory.v1"))).toBe(savedMemory);
  expect(await page.evaluate(() => localStorage.getItem("afterlight.household-drill.v1"))).toBe(savedDrill);
});

test("persists scenario memory independently and clears only the requested scope", async ({ page }) => {
  await page.goto("/");

  const confirm = page.locator(".memory-confirm-label input");
  const edit = page.locator(".failure-card textarea");
  await confirm.check();
  await edit.fill("Palisades-only household lesson");
  await expect(page.getByText("Latest memory change saved on this device.")).toBeVisible();

  await page.getByRole("button", { name: /Eaton Fire/i }).click();
  await expect(confirm).not.toBeChecked();
  await confirm.check();
  await edit.fill("Eaton-only household lesson");
  await page.reload();

  await expect(confirm).toBeChecked();
  await expect(edit).toHaveValue("Palisades-only household lesson");
  await page.getByRole("button", { name: /Eaton Fire/i }).click();
  await expect(confirm).toBeChecked();
  await expect(edit).toHaveValue("Eaton-only household lesson");
  await page.getByRole("button", { name: "Clear this case" }).click();
  await page.getByRole("alertdialog", { name: "Clear this case memory?" }).getByRole("button", { name: "Delete case memory" }).click();
  await expect(confirm).not.toBeChecked();
  await expect(edit).not.toHaveValue("Eaton-only household lesson");

  await page.getByRole("button", { name: /Palisades Fire/i }).click();
  await expect(confirm).toBeChecked();
  await page.getByRole("button", { name: "Clear all device memory" }).click();
  await page.getByRole("alertdialog", { name: "Clear all Afterlight device memory?" }).getByRole("button", { name: "Delete all device memory" }).click();
  await expect(confirm).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("afterlight.household-memory.v1"))).toBeNull();
});

test("keeps destructive confirmation focus contained and restores its trigger", async ({ page }) => {
  await page.goto("/");

  const clearCase = page.getByRole("button", { name: "Clear this case" });
  await clearCase.focus();
  await clearCase.click();
  const memoryDialog = page.getByRole("alertdialog", { name: "Clear this case memory?" });
  const keepMemory = memoryDialog.getByRole("button", { name: "Keep memory" });
  const deleteCase = memoryDialog.getByRole("button", { name: "Delete case memory" });
  await expect(keepMemory).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(deleteCase).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keepMemory).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(memoryDialog).toHaveCount(0);
  await expect(clearCase).toBeFocused();

  const clearDrill = page.getByRole("button", { name: "Clear drill data" });
  await clearDrill.focus();
  await clearDrill.click();
  const drillDialog = page.getByRole("alertdialog", { name: "Clear household drill?" });
  await expect(drillDialog.getByRole("button", { name: "Keep drill" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drillDialog).toHaveCount(0);
  await expect(clearDrill).toBeFocused();
});

test("purges hidden drill data when a historical lesson is unconfirmed", async ({ page }) => {
  await page.goto("/");

  const confirm = page.locator(".memory-confirm-label input").first();
  await confirm.check();
  const taskTitle = "Practice lesson: Resident-only closure appears before ignition";
  const owner = page.locator("#practice").getByRole("textbox", { name: `Primary owner role for ${taskTitle}` });
  await owner.fill("Lesson lead");
  await expect.poll(async () => {
    const raw = await page.evaluate(() => localStorage.getItem("afterlight.household-drill.v1"));
    return raw ? JSON.parse(raw).assignments["lesson:palisades-resident-only-closure"]?.ownerRole : null;
  }).toBe("Lesson lead");

  await confirm.uncheck();
  await expect(page.locator("#practice").getByRole("heading", { name: taskTitle })).toHaveCount(0);
  expect(await page.evaluate(() => {
    const raw = localStorage.getItem("afterlight.household-drill.v1");
    return raw ? JSON.parse(raw).assignments["lesson:palisades-resident-only-closure"] : null;
  })).toBeUndefined();
});

test("clears stale hidden drill data for the selected historical case", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("afterlight.household-drill.v1", JSON.stringify({
      version: 1,
      constraints: [],
      assignments: {
        "base:official-sources": {
          ownerRole: "Alert checker",
          backupRole: "Backup adult",
          actionNote: "County alerts plus local fire agency",
          practiced: true
        },
        "lesson:palisades-warning-zones": {
          ownerRole: "Lesson lead",
          backupRole: "Backup adult",
          actionNote: "Practice a communication handoff",
          practiced: true
        }
      },
      lastPracticedOn: "2026-07-12"
    }));
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Clear this case" }).click();
  await page.getByRole("alertdialog", { name: "Clear this case memory?" }).getByRole("button", { name: "Delete case memory" }).click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("afterlight.household-drill.v1") ?? "null"));
  expect(saved.assignments["lesson:palisades-warning-zones"]).toBeUndefined();
  expect(saved.assignments["base:official-sources"]).toBeDefined();
  expect(saved.lastPracticedOn).toBeNull();
});

test("prunes stale hidden drill assignments and practice date during reload", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("afterlight.household-drill.v1", JSON.stringify({
      version: 1,
      constraints: [],
      assignments: {
        "lesson:palisades-warning-zones": {
          ownerRole: "Hidden lesson lead",
          backupRole: "Hidden backup",
          actionNote: "Practice a communication handoff",
          practiced: true
        }
      },
      lastPracticedOn: "2026-07-12"
    }));
  });
  await page.goto("/");

  await expect(page.locator("#practice").getByRole("status")).toContainText("No household practice date recorded");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("afterlight.household-drill.v1") ?? "null"));
  expect(saved.assignments["lesson:palisades-warning-zones"]).toBeUndefined();
  expect(saved.lastPracticedOn).toBeNull();
});

test("keeps the drill date for unconfirmed edits and clears it when the task set changes", async ({ page }) => {
  await page.goto("/");

  const practice = page.locator("#practice");
  await practice.getByRole("textbox", { name: "Primary owner role for Choose official information channels" }).fill("Alert checker");
  await practice.getByRole("textbox", { name: "Backup owner role for Choose official information channels" }).fill("Backup adult");
  await practice.getByRole("combobox", { name: "Household decision for Choose official information channels" }).selectOption("County alerts plus local fire agency");
  await practice.getByRole("checkbox", { name: "Mark Choose official information channels as practiced" }).check();
  await practice.getByRole("button", { name: "Record practice today" }).click();
  await expect(practice.getByRole("status")).toContainText("Practice recorded");

  await page.locator(".failure-card textarea").fill("Unconfirmed household interpretation");
  await expect(practice.getByRole("status")).toContainText("Practice recorded");
  await page.getByRole("button", { name: "Clear this case" }).click();
  await page.getByRole("alertdialog", { name: "Clear this case memory?" }).getByRole("button", { name: "Delete case memory" }).click();
  await expect(practice.getByRole("status")).toContainText("Practice recorded");
  await page.locator(".memory-confirm-label input").first().check();
  await expect(practice.getByRole("status")).toContainText("No household practice date recorded");
});

test("rejects private household details from memory edits and drill roles", async ({ page }) => {
  await page.goto("/");

  const edit = page.locator(".failure-card textarea");
  await edit.fill("Meet at 123 Main Street and call 555-123-4567");
  await expect(edit).not.toHaveValue(/123 Main Street/);
  expect(await page.evaluate(() => localStorage.getItem("afterlight.household-memory.v1") ?? "")).not.toContain("123 Main Street");
  await expect(page.locator(".memory-storage-note")).toContainText("Obvious exact-address");

  const practice = page.locator("#practice");
  const owner = practice.getByRole("textbox", { name: "Primary owner role for Choose official information channels" });
  const backup = practice.getByRole("textbox", { name: "Backup owner role for Choose official information channels" });
  await owner.fill("Alert checker");
  await backup.fill("Backup 555-123-4567");
  await expect(backup).toHaveValue("");
  await practice.getByRole("combobox", { name: "Household decision for Choose official information channels" }).selectOption("County alerts plus local fire agency");
  await expect(practice.getByRole("checkbox", { name: "Mark Choose official information channels as practiced" })).toBeDisabled();
  const savedDrill = await page.evaluate(() => localStorage.getItem("afterlight.household-drill.v1") ?? "");
  expect(savedDrill).not.toContain("555-123-4567");
  await expect(practice).not.toContainText("555-123-4567");
});

test("renders incident-specific historical maps, evaluation rows, and the Camp negative control", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Palisades Fire historical source map")).toBeVisible();
  await expect(page.getByText(/historical OSM road snapshot/).first()).toBeVisible();
  const evaluation = page.locator("#evaluation-preview");
  await expect(evaluation.getByRole("row", { name: /Palisades Fire/ })).toContainText("attributable");
  await expect(evaluation.getByRole("row", { name: /Eaton Fire/ })).toContainText("detected");
  await expect(evaluation.getByText("Camp Fire · not scored")).toBeVisible();
  await expect(evaluation).toContainText("Granular replay is blocked because official source rows are not loaded");

  await page.getByRole("button", { name: /Eaton Fire/i }).click();
  await expect(page.getByLabel("Eaton Fire historical source map")).toBeVisible();
});

test("builds a persistent household drill without changing the hero or implying emergency guidance", async ({ page }) => {
  const demoAssetRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("afterlight-higgsfield-opening")) demoAssetRequests.push(request.url());
  });
  await page.goto("/");

  const heroBackground = await page.locator(".hero-image").evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(heroBackground).toContain("afterlight-hero.jpg");
  expect(demoAssetRequests).toEqual([]);
  await expect(page.getByRole("link", { name: "Build household drill" })).toHaveAttribute("href", "#practice");

  const practice = page.locator("#practice");
  await expect(practice.getByRole("heading", { name: "Build the drill your household can actually practice." })).toBeVisible();
  await expect(practice.getByRole("button", { name: "Record practice today" })).toBeDisabled();
  await expect(practice.getByRole("link", { name: "CAL FIRE firePLANNER" })).toHaveAttribute(
    "href",
    "https://plan.readyforwildfire.org/"
  );
  await expect(practice.getByRole("link", { name: "Ready.gov Make a Plan" })).toHaveAttribute(
    "href",
    "https://www.ready.gov/plan"
  );
  await expect(practice.getByRole("link", { name: "Red Cross wildfire preparedness" })).toHaveAttribute(
    "href",
    "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html"
  );
  await practice.getByRole("checkbox", { name: "Mobility support" }).check();
  await practice.getByRole("checkbox", { name: "Pets or service animals" }).check();
  await expect(practice.getByRole("heading", { name: "Practice the mobility-assistance handoff" })).toBeVisible();
  await expect(practice.getByRole("heading", { name: "Practice the animal handoff" })).toBeVisible();

  const mobilityOwner = practice.getByRole("textbox", { name: "Primary owner role for Practice the mobility-assistance handoff" });
  await mobilityOwner.pressSequentially("Mobility helper");
  await expect(mobilityOwner).toHaveValue("Mobility helper");
  await practice.getByRole("textbox", { name: "Backup owner role for Practice the mobility-assistance handoff" }).fill("Backup helper");
  const mobilityDecision = practice.getByRole("combobox", { name: "Household decision for Practice the mobility-assistance handoff" });
  expect(await mobilityDecision.locator("option").allTextContents()).toEqual([
    "Choose a coarse pattern",
    "Equipment handoff plus loading rehearsal",
    "Helper handoff plus extra-time rehearsal"
  ]);
  await mobilityDecision.selectOption("Equipment handoff plus loading rehearsal");
  await practice.getByRole("checkbox", { name: "Mark Practice the mobility-assistance handoff as practiced" }).check();
  await expect(practice.getByRole("button", { name: "Record practice today" })).toBeEnabled();

  await page.locator(".memory-confirm-label input").first().check();
  await expect(practice.getByRole("heading", { name: "Practice lesson: Resident-only closure appears before ignition" })).toBeVisible();
  await expect(practice).toContainText("Afterlight takeaway based on FSRI Palisades worksheet");
  await expect(practice).toContainText("Evidence-linked lessons");
  await practice.getByRole("button", { name: "Record practice today" }).click();
  await expect(practice.getByRole("status")).toContainText("Practice recorded");
  await expect(practice.getByRole("status")).toContainText("unresolved");
  await expect(practice.getByText("Practice card · not emergency guidance")).toBeVisible();
  await expect(practice).toContainText("Structured decision");
  await expect(practice).not.toContainText(/readiness score|safe to evacuate|ready for wildfire/i);

  await page.reload();
  await expect(page.locator("#practice").getByRole("checkbox", { name: "Mobility support" })).toBeChecked();
  await expect(page.locator("#practice").getByRole("textbox", { name: "Primary owner role for Practice the mobility-assistance handoff" })).toHaveValue("Mobility helper");
  await expect(page.locator("#practice").getByRole("combobox", { name: "Household decision for Practice the mobility-assistance handoff" })).toHaveValue(
    "Equipment handoff plus loading rehearsal"
  );
  const reloadedPractice = page.locator("#practice");
  await reloadedPractice.getByRole("textbox", { name: "Backup owner role for Practice the mobility-assistance handoff" }).fill("Neighbor backup");
  await expect(reloadedPractice.getByRole("checkbox", { name: "Mark Practice the mobility-assistance handoff as practiced" })).not.toBeChecked();
  await expect(reloadedPractice.getByRole("status")).toContainText("No household practice date recorded");

  await reloadedPractice.getByRole("button", { name: "Clear drill data" }).click();
  const clearConfirmation = reloadedPractice.getByRole("alertdialog", { name: "Clear household drill?" });
  await expect(clearConfirmation).toContainText("constraints, decisions, roles, handoffs, and practice date");
  await clearConfirmation.getByRole("button", { name: "Keep drill" }).click();
  await expect(reloadedPractice.getByRole("textbox", { name: "Primary owner role for Practice the mobility-assistance handoff" })).toHaveValue("Mobility helper");
  await reloadedPractice.getByRole("button", { name: "Clear drill data" }).click();
  await reloadedPractice.getByRole("button", { name: "Delete drill data" }).click();
  expect(await page.evaluate(() => localStorage.getItem("afterlight.household-drill.v1"))).toBeNull();
  expect(demoAssetRequests).toEqual([]);
});

test("has no horizontal overflow or clipped key surfaces at 390px and 320px", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const practice = page.locator("#practice");
    await practice.getByRole("textbox", { name: "Primary owner role for Choose official information channels" }).fill("O".repeat(48));
    await practice.getByRole("textbox", { name: "Backup owner role for Choose official information channels" }).fill("B".repeat(48));
    await practice.getByRole("combobox", { name: "Household decision for Choose official information channels" }).selectOption("County alerts plus local fire agency");
    await page.locator(".memory-confirm-label input").first().check();
    await page.locator(".failure-card textarea").fill("Y".repeat(600));
    const geometry = await page.locator(
      ".site-header, h1, .hero-copy, .hero-actions, .search-console, #connectors, #replay, .control-strip, .ops-grid, .lower-grid, .evaluation-panel, .negative-control, #practice, .drill-layout, .drill-setup, .drill-workbench, .drill-control-panel, .practice-card, .offline-grid"
    ).evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { selector: node.className || node.id || node.tagName, left: rect.left, right: rect.right };
    }));
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const navTargetHeights = await page.locator(".nav-links a").evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height)
    );

    expect(scrollWidth, `document width at ${width}px`).toBeLessThanOrEqual(width);
    for (const height of navTargetHeights) {
      expect(height, `header navigation target height at ${width}px`).toBeGreaterThanOrEqual(32);
    }
    for (const item of geometry) {
      expect(item.left, `${String(item.selector)} left edge at ${width}px`).toBeGreaterThanOrEqual(-0.5);
      expect(item.right, `${String(item.selector)} right edge at ${width}px`).toBeLessThanOrEqual(width + 0.5);
    }
    const taskTop = await page.locator(".drill-task-panel").evaluate((element) => element.getBoundingClientRect().top);
    const controlsTop = await page.locator(".drill-control-panel").evaluate((element) => element.getBoundingClientRect().top);
    expect(controlsTop, `drill actions follow the ledger at ${width}px`).toBeGreaterThan(taskTop);
  }
});

test("print media isolates the real practice card and keeps rows intact", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".practice-card")).toBeVisible();
  await expect(page.locator(".preparedness-references")).toBeHidden();
  await expect(page.locator(".drill-control-panel")).toBeHidden();
  await expect(page.locator(".drill-task-panel")).toBeHidden();
  await expect(page.locator(".practice-card-rows > div").first()).toHaveCSS("break-inside", "avoid");
});

test("printable household drill card excludes live, historical, coordinate, and saved-memory records", async ({ page }) => {
  await page.unroute("**/WFIGS_Incident_Locations_Current/**");
  await page.route("**/WFIGS_Incident_Locations_Current/**", (route) => json(route, {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [-118.987654, 34.123456] },
      properties: {
        OBJECTID: 42,
        IncidentName: "MOCK LIVE INCIDENT PRINT SENTINEL",
        UniqueFireIdentifier: "2026-CALAC-PRINT-SENTINEL",
        IncidentSize: 24,
        PercentContained: 15,
        FireDiscoveryDateTime: Date.UTC(2026, 5, 30, 9, 33),
        ModifiedOnDateTime_dt: Date.UTC(2026, 5, 30, 10, 4),
        POOCounty: "Los Angeles",
        POOState: "US-CA",
        POOProtectingAgency: "CAL FIRE"
      }
    }]
  }));
  await page.unroute("**/api.weather.gov/alerts/active**");
  await page.route("**/api.weather.gov/alerts/active**", (route) => json(route, {
    type: "FeatureCollection",
    features: [{
      properties: {
        event: "LIVE ALERT PRINT SENTINEL",
        headline: "LIVE ALERT PRINT SENTINEL headline",
        severity: "Severe",
        effective: "2026-07-03T18:00:00Z"
      }
    }]
  }));
  await page.addInitScript(() => {
    localStorage.setItem("afterlight.household-memory.v1", JSON.stringify({
      version: 1,
      scenarios: {
        "palisades-2025": {
          confirmedIds: ["palisades-resident-only-closure"],
          edits: { "palisades-resident-only-closure": "SAVED MEMORY EDIT PRINT SENTINEL" }
        }
      }
    }));
    localStorage.setItem("afterlight.household-drill.v1", JSON.stringify({
      version: 1,
      constraints: ["mobility"],
      assignments: {
        "base:official-sources": {
          ownerRole: "Alert checker",
          backupRole: "Backup adult",
          actionNote: "County alerts plus local fire agency",
          practiced: true
        }
      },
      lastPracticedOn: "2026-07-12"
    }));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Find fires" }).click();
  await expect(page.locator("#connectors")).toContainText("MOCK LIVE INCIDENT PRINT SENTINEL");
  await expect(page.locator("#connectors")).toContainText("LIVE ALERT PRINT SENTINEL");

  const card = page.locator(".practice-card");
  await expect(card).toContainText("Practice card · not emergency guidance");
  await expect(card).toContainText("Afterlight household drill");
  await expect(card).toContainText("Choose official information channels");
  await expect(card).toContainText("Practice the mobility-assistance handoff");
  await expect(card).toContainText("Practice lesson: Resident-only closure appears before ignition");
  await expect(card).toContainText("Alert checker");
  await expect(card).toContainText("Backup adult");
  await expect(card).toContainText("Unresolved");

  const printableText = await card.innerText();
  expect(printableText).not.toContain("MOCK LIVE INCIDENT PRINT SENTINEL");
  expect(printableText).not.toContain("LIVE ALERT PRINT SENTINEL");
  expect(printableText).not.toContain("official_action");
  expect(printableText).not.toContain("access_restricted");
  expect(printableText).not.toContain("34.123456");
  expect(printableText).not.toContain("-118.987654");
  expect(printableText).not.toContain("SAVED MEMORY EDIT PRINT SENTINEL");
  await page.emulateMedia({ media: "print" });
  await expect(card).toBeVisible();
});

test("captures stable desktop and mobile QA screenshots", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.screenshot({
    path: `artifacts/screenshots/afterlight-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled"
  });
});
