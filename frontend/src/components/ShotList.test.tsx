import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShotList } from "./ShotList";
import type { Asset, Shot } from "../types";

const apiMock = vi.hoisted(() => ({
  getShotQualityReview: vi.fn(),
  saveShotQualityReview: vi.fn(),
  assetFileUrl: vi.fn(),
}));

vi.mock("../api/client", () => ({
  api: apiMock,
}));

const shot: Shot = {
  id: 1,
  project_id: 1,
  shot_number: 3,
  scene_number: 1,
  duration_seconds: 6,
  purpose: "Open the glowing door",
  camera_framing: "wide",
  camera_movement: "slow push",
  characters_present: "Mia",
  location_name: "Treehouse",
  action: "Mia opens the tiny door",
  emotion: "wonder",
  image_prompt: "storybook treehouse",
  start_frame_prompt: "Mia reaches for a glowing door",
  end_frame_prompt: "The doorway reveals floating lights",
  video_prompt: "gentle magical camera move",
  negative_prompt: "no violence, no horror",
  status: "Draft",
  notes: "",
};

const attachedAsset: Asset = {
  id: 9,
  project_id: 1,
  shot_id: 1,
  asset_type: "start_frame",
  filename_or_path: "start.png",
  original_filename: "start.png",
  stored_filename: "stored.png",
  relative_path: "project_1/stored.png",
  mime_type: "image/png",
  size_bytes: 12,
  preview_url: "/api/assets/9/file",
  download_url: "/api/assets/9/file",
  notes: "approved start frame",
  created_at: "2026-01-01T00:00:00Z",
};

describe("ShotList", () => {
  beforeEach(() => {
    apiMock.getShotQualityReview.mockResolvedValue({
      id: 1,
      project_id: 1,
      shot_id: 1,
      character_consistency_score: 0,
      location_continuity_score: 0,
      visual_style_score: 0,
      motion_quality_score: 0,
      safety_score: 0,
      prompt_readiness_score: 0,
      asset_readiness_score: 0,
      review_notes: "",
      approved_for_final: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    apiMock.saveShotQualityReview.mockResolvedValue({
      id: 1,
      project_id: 1,
      shot_id: 1,
      character_consistency_score: 5,
      location_continuity_score: 0,
      visual_style_score: 0,
      motion_quality_score: 0,
      safety_score: 0,
      prompt_readiness_score: 0,
      asset_readiness_score: 0,
      review_notes: "Looks consistent.",
      approved_for_final: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    apiMock.assetFileUrl.mockImplementation((asset: Asset) => asset.preview_url);
  });

  it("copies a Wan 2.2 prompt package for the selected shot", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ShotList
        shots={[shot]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /copy wan 2.2 package/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("SHOT 3 - Open the glowing door"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("START FRAME:"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("NEGATIVE PROMPT:"));
  });

  it("shows runtime totals", () => {
    render(
      <ShotList
        shots={[shot, { ...shot, id: 2, shot_number: 4, duration_seconds: 9, status: "Approved" }]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    expect(screen.getByText("15s planned | 165s remaining")).toBeInTheDocument();
    expect(screen.getByText("50% approved/final")).toBeInTheDocument();
  });

  it("calls reorder when moving a shot", async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);
    render(
      <ShotList
        shots={[shot, { ...shot, id: 2, shot_number: 4, purpose: "Second shot" }]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={onReorder}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    const firstRow = screen.getAllByRole("listitem")[0];
    await userEvent.click(within(firstRow).getByTitle("Move down"));

    expect(onReorder).toHaveBeenCalledWith([2, 1]);
  });

  it("copies individual prompt fields", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ShotList
        shots={[shot]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]);

    expect(writeText).toHaveBeenCalledWith("storybook treehouse");
    expect(await screen.findByText("Image prompt copied")).toBeInTheDocument();
  });

  it("saves status changes", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <ShotList
        shots={[shot]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Status"), "Approved");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ status: "Approved" }));
  });

  it("renders selected shot attached assets", () => {
    render(
      <ShotList
        shots={[shot]}
        assets={[attachedAsset]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
      />,
    );

    expect(screen.getByText("Attached assets")).toBeInTheDocument();
    expect(screen.getByText("start.png")).toBeInTheDocument();
    expect(screen.getByText("approved start frame")).toBeInTheDocument();
  });

  it("updates the production quality gate", async () => {
    const onQualityReviewSaved = vi.fn().mockResolvedValue(undefined);
    render(
      <ShotList
        shots={[shot]}
        assets={[]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={onQualityReviewSaved}
      />,
    );

    await userEvent.clear(await screen.findByLabelText("Character consistency"));
    await userEvent.type(screen.getByLabelText("Character consistency"), "5");
    await userEvent.type(screen.getByLabelText("Review notes"), "Looks consistent.");
    await userEvent.click(screen.getByLabelText("Final approval readiness"));
    await userEvent.click(screen.getByRole("button", { name: /save quality gate/i }));

    expect(apiMock.saveShotQualityReview).toHaveBeenCalledWith(1, expect.objectContaining({
      character_consistency_score: 5,
      review_notes: "Looks consistent.",
      approved_for_final: true,
    }));
    expect(onQualityReviewSaved).toHaveBeenCalled();
  });
});
