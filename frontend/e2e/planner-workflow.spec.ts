import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";

const API_BASE = "http://127.0.0.1:8011/api";

test.beforeEach(async ({ request }) => {
  await resetProjects(request);
});

test("Scenario A - basic project planning flow", async ({ page }) => {
  await page.goto("/");

  const projectTitle = `E2E Planning ${Date.now()}`;
  await page.getByLabel("Title").fill(projectTitle);
  await page.getByLabel("Visual style").fill("bright storybook 3D");
  await page.getByRole("button", { name: /create project/i }).click();

  await expect(page.getByText(projectTitle).first()).toBeVisible();
  await expect(page.getByLabel("Production workflow")).toContainText("Add story context");
  await expect(page.getByRole("button", { name: "Interview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Shots" })).toBeVisible();

  await page.getByRole("button", { name: "Interview" }).click();
  await page.getByLabel("What is the title?").fill("The E2E Moon Map");
  await page.getByLabel("What is the magical discovery?").fill("A glowing compass");
  await page.getByLabel("Who are the main kid characters?").fill("Mia and Jo");
  await page.getByLabel("Where does the adventure begin?").fill("A backyard treehouse");
  await page.getByLabel("What is the main adventure location?").fill("A floating garden");
  await page.getByLabel("What small problem happens?").fill("The garden lights get mixed up");
  await page.getByLabel("How do the kids solve it together?").fill("They match colors and sing together");
  await page.getByLabel("What should the ending feel like?").fill("Warm and proud");
  await page.getByLabel("What visual style should the film use?").fill("Soft miniature storybook");
  await page.getByLabel("What should the film avoid?").fill("Anything scary");
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Characters" }).click();
  const characterForm = page.locator("form.resource-form").first();
  await characterForm.getByLabel("Name").fill("Mia");
  await characterForm.getByLabel("Role").fill("curious inventor");
  await characterForm.getByLabel("Age").fill("7");
  await characterForm.getByRole("button", { name: /add character/i }).click();
  await expect(page.locator(".resource-card").getByLabel("Role", { exact: true })).toHaveValue("curious inventor");

  await page.getByRole("button", { name: "Locations" }).click();
  const locationForm = page.locator("form.resource-form").first();
  await locationForm.getByLabel("Name").fill("Floating Garden");
  await locationForm.getByLabel("Mood").fill("wonder");
  await locationForm.getByLabel("Lighting").fill("golden afternoon");
  await locationForm.getByRole("button", { name: /add location/i }).click();
  await expect(page.locator(".resource-card").getByLabel("Lighting", { exact: true })).toHaveValue("golden afternoon");

  await page.getByRole("button", { name: "Shots" }).click();
  await createShotFromUi(page, "Opening wonder", 5);
  await createShotFromUi(page, "Garden reveal", 5);
  await createShotFromUi(page, "Teamwork solution", 5);

  await expect(page.getByText("15s planned | 165s remaining")).toBeVisible();
  await page.locator("form.shot-detail").getByLabel("Status").first().selectOption("Approved");
  await page.locator("form.shot-detail").getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText("33% approved/final")).toBeVisible();
});

test("Scenario B - shot prompt copy flow", async ({ page, request }) => {
  await installClipboardStub(page);
  const project = await createProject(request, `E2E Copy ${Date.now()}`);
  await createShot(request, project.id, {
    purpose: "Open the glowing door",
    image_prompt: "storybook treehouse",
    start_frame_prompt: "Mia reaches for a glowing door",
    end_frame_prompt: "The doorway reveals floating lights",
    video_prompt: "gentle magical camera move",
    negative_prompt: "no violence, no horror",
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Shots" }).click();

  await page.getByLabel("Wan 2.2 prompt fields").getByRole("button", { name: "Copy" }).first().click();
  await expect(page.getByText("Image prompt copied")).toBeVisible();

  await page.getByRole("button", { name: /copy wan 2.2 package/i }).click();
  await expect(page.getByText("Wan package copied")).toBeVisible();
});

test("Scenario E - production bible and quality gate flow", async ({ page }) => {
  await page.goto("/");

  const projectTitle = `E2E Production Bible ${Date.now()}`;
  await page.getByLabel("Title").fill(projectTitle);
  await page.getByLabel("Visual style").fill("soft paper diorama");
  await page.getByRole("button", { name: /create project/i }).click();
  await expect(page.getByText(projectTitle).first()).toBeVisible();

  await page.getByRole("button", { name: "Production Bible", exact: true }).click();
  const bibleSection = page.getByLabel("Production Bible");
  await expect(bibleSection).toBeVisible();
  await bibleSection.getByLabel("Visual style").fill("soft paper diorama with warm miniature lighting");
  await bibleSection.getByLabel("Negative prompt rules").fill("no text, no logos, no watermarks, no distorted hands");
  await bibleSection.getByRole("button", { name: /save bible/i }).click();
  await bibleSection.getByRole("button", { name: /lock bible/i }).click();
  await expect(page.getByRole("heading", { name: "Locked source of truth" })).toBeVisible();
  await expect(bibleSection.getByLabel("Visual style")).toBeDisabled();
  await expect(bibleSection.getByLabel("Negative prompt rules")).toBeDisabled();

  await page.getByRole("button", { name: "Shots" }).click();
  await createShotFromUi(page, "Production review shot", 5);
  const qualityGate = page.getByLabel("Production Quality Gate");
  await expect(qualityGate).toBeVisible();
  await qualityGate.getByLabel("Character consistency").fill("4");
  await qualityGate.getByLabel("Location continuity").fill("5");
  await qualityGate.getByLabel("Visual style").fill("4");
  await qualityGate.getByLabel("Review notes").fill("Ready after checking the locked bible.");
  await qualityGate.getByLabel("Final approval readiness").check();
  await qualityGate.getByRole("button", { name: /save quality gate/i }).click();
  await expect(page.getByText("Quality gate saved")).toBeVisible();

  await page.reload();
  await expect(page.getByText(projectTitle).first()).toBeVisible();
  await page.getByRole("button", { name: "Shots" }).click();
  const reloadedQualityGate = page.getByLabel("Production Quality Gate");
  await expect(reloadedQualityGate.getByLabel("Character consistency")).toHaveValue("4");
  await expect(reloadedQualityGate.getByLabel("Location continuity")).toHaveValue("5");
  await expect(reloadedQualityGate.getByLabel("Review notes")).toHaveValue("Ready after checking the locked bible.");
  await expect(reloadedQualityGate.getByLabel("Final approval readiness")).toBeChecked();
});

test("Scenario C - asset upload and preview flow", async ({ page, request }) => {
  const project = await createProject(request, `E2E Asset ${Date.now()}`);
  const shot = await createShot(request, project.id, { purpose: "Asset shot" });
  const fixturePath = path.resolve(__dirname, "fixtures/sample.vtt");

  await page.goto("/");
  await page.getByRole("button", { name: "Assets" }).click();
  await page.getByLabel("Upload type").selectOption("subtitle");
  await page.getByLabel("Attach to").first().selectOption(String(shot.id));
  await page.locator(".asset-upload-form input[type='file']").setInputFiles(fixturePath);
  await page.getByLabel("Notes").first().fill("E2E subtitle asset");
  await page.getByRole("button", { name: /upload asset/i }).click();

  await expect(page.getByText("sample.vtt")).toBeVisible();
  await expect(page.getByText("text/vtt")).toBeVisible();
  await expect(page.getByText("Shot 1: Asset shot")).toBeVisible();
  await expect(page.getByRole("link", { name: /open file/i })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".asset-card").getByRole("button", { name: /delete/i }).click();
  await expect(page.getByText("sample.vtt")).toBeHidden();
});

test("Scenario F - shot takes and approval handoff flow", async ({ page }) => {
  await page.goto("/");

  const projectTitle = `E2E Shot Takes ${Date.now()}`;
  const fixturePath = path.resolve(__dirname, "fixtures/sample.vtt");
  await page.getByLabel("Title").fill(projectTitle);
  await page.getByRole("button", { name: /create project/i }).click();
  await expect(page.getByText(projectTitle).first()).toBeVisible();

  await page.getByRole("button", { name: "Shots" }).click();
  await createShotFromUi(page, "Take review shot", 5);
  await page.getByLabel("Video prompt").fill("gentle magical camera move for take review");
  await page.getByLabel("Negative prompt").fill("no text, no logos, no scary danger");
  await page.locator("form.shot-detail").getByRole("button", { name: /^Save$/ }).click();

  await page.getByRole("button", { name: "Assets" }).click();
  await page.getByLabel("Upload type").selectOption("subtitle");
  await page.getByLabel("Attach to").first().selectOption({ label: "Shot 1" });
  await page.locator(".asset-upload-form input[type='file']").setInputFiles(fixturePath);
  await page.getByLabel("Notes").first().fill("Subtitle used to link manual take");
  await page.getByRole("button", { name: /upload asset/i }).click();
  await expect(page.getByText("sample.vtt")).toBeVisible();

  await page.getByRole("button", { name: "Shots" }).click();
  await expect(page.getByText(/No takes yet/i)).toBeVisible();
  await page.getByLabel("Subtitle").selectOption({ label: "sample.vtt" });
  await page.getByRole("button", { name: /create take/i }).click();
  const takeA = page.locator(".take-card").filter({ hasText: "Take A" });
  await expect(takeA).toBeVisible();
  await expect(takeA.getByRole("textbox", { name: "Prompt snapshot", exact: true })).toHaveValue(/gentle magical camera move for take review/);
  await takeA.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approved take: Take A" })).toBeVisible();

  await page.getByLabel("Subtitle").first().selectOption({ label: "sample.vtt" });
  await page.getByRole("button", { name: /create take/i }).click();
  const takeB = page.locator(".take-card").filter({ hasText: "Take B" });
  await expect(takeB).toBeVisible();
  await takeB.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Approved take: Take B" })).toBeVisible();
  await expect(takeB).toContainText("Approved final take");
  await expect(takeA).not.toContainText("Approved final take");
});

test("Scenario D - AI panels safe-state flow", async ({ page, request }) => {
  const project = await createProject(request, `E2E AI Safe ${Date.now()}`);
  await page.goto("/");
  await expect(page.getByText(project.title).first()).toBeVisible();

  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.getByLabel("AI story package generator")).toBeVisible();
  await expect(page.getByText(/uses your backend openai key only/i)).toBeVisible();
  await expect(page.getByText(/wavespeed video generation is not enabled yet/i)).toBeVisible();

  await page.getByRole("button", { name: "Shots" }).click();
  await expect(page.getByLabel("AI Wan 2.2 prompt generator")).toBeVisible();
  await expect(page.getByText(/add storyboard shots before generating/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /generate wan 2.2 prompts/i })).toBeDisabled();
});

test("Scenario G - manual story start without interview", async ({ page }) => {
  await installClipboardStub(page);
  await page.goto("/");

  const projectTitle = `E2E Manual Start ${Date.now()}`;
  await page.getByLabel("Title").fill(projectTitle);
  await page.getByRole("button", { name: /create project/i }).click();
  await expect(page.getByText(projectTitle).first()).toBeVisible();

  await page.getByRole("button", { name: "Story" }).click();
  const storyPanel = page.getByLabel("AI story package generator");
  await expect(storyPanel).toBeVisible();
  await expect(storyPanel.getByText(/manual story text, production bible, characters, locations, or existing shots/i)).toBeVisible();
  await page.getByLabel("Logline").fill("Two cousins follow a glowing kite to a gentle sky garden.");
  await page.getByLabel("Synopsis").fill("They work together to guide sleepy star flowers home.");
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Shots" }).click();
  await createShotFromUi(page, "Manual story opening", 5);
  const shotDetail = page.locator("form.shot-detail");
  await shotDetail.getByLabel("Characters present").fill("Mia and Jo");
  await shotDetail.getByLabel("Location", { exact: true }).fill("Sky Garden gate");
  await shotDetail.getByLabel("Action").fill("Mia and Jo stand still while the glowing kite points toward the garden");
  await shotDetail.getByLabel("Camera framing").fill("medium wide shot");
  await shotDetail.getByLabel("Camera movement").fill("static camera");
  await shotDetail.getByLabel("Image prompt").fill("bright 16:9 storybook frame of cousins with a glowing kite");
  await shotDetail.getByLabel("Start frame prompt").fill("The kite glows softly beside the cousins");
  await shotDetail.getByLabel("End frame prompt").fill("A sky garden appears beyond soft clouds");
  await shotDetail.getByLabel("Video prompt").fill("Gentle push forward as the kite floats toward the sky garden");
  await shotDetail.getByLabel("Negative prompt").fill("no text, no logos, no scary danger");
  await shotDetail.getByRole("button", { name: /^Save$/ }).click();

  const wanPanel = page.getByLabel("AI Wan 2.2 prompt generator");
  await expect(wanPanel).toContainText("guided interview is not required");
  await expect(wanPanel).toContainText("strict framework: cast count, locked camera/framing, action timeline, and motion boundaries");
  await page.getByRole("button", { name: /copy wan 2.2 package/i }).click();
  await expect(page.getByText("Wan package copied")).toBeVisible();
});

async function createShotFromUi(page: Page, purpose: string, durationSeconds: number) {
  const addForm = page.locator("form.shot-add");
  await addForm.getByLabel("Purpose").fill(purpose);
  await addForm.getByLabel("Duration").fill(String(durationSeconds));
  await addForm.getByRole("button", { name: /add shot/i }).click();
  await expect(page.getByText(purpose).first()).toBeVisible();
  await expect(addForm.getByLabel("Purpose")).toHaveValue("");
}

async function resetProjects(request: APIRequestContext) {
  const response = await request.get(`${API_BASE}/projects`);
  if (!response.ok()) {
    return;
  }
  const projects = await response.json() as { id: number }[];
  for (const project of projects) {
    await request.delete(`${API_BASE}/projects/${project.id}`);
  }
}

async function createProject(request: APIRequestContext, title: string) {
  const response = await request.post(`${API_BASE}/projects`, { data: { title } });
  expect(response.ok()).toBeTruthy();
  return await response.json() as { id: number; title: string };
}

async function createShot(
  request: APIRequestContext,
  projectId: number,
  data: Record<string, string | number>,
) {
  const response = await request.post(`${API_BASE}/projects/${projectId}/shots`, {
    data: { duration_seconds: 5, ...data },
  });
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

async function installClipboardStub(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          window.localStorage.setItem("e2e:lastClipboard", text);
        },
      },
      configurable: true,
    });
  });
}
