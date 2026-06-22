import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShotList } from "./ShotList";
import type { Asset, Shot, ShotTake } from "../types";

const apiMock = vi.hoisted(() => ({
  getShotQualityReview: vi.fn(),
  saveShotQualityReview: vi.fn(),
  listShotTakes: vi.fn(),
  createShotTake: vi.fn(),
  updateShotTake: vi.fn(),
  deleteShotTake: vi.fn(),
  approveShotTake: vi.fn(),
  rejectShotTake: vi.fn(),
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

const generatedVideo: Asset = {
  ...attachedAsset,
  id: 10,
  asset_type: "generated_video",
  filename_or_path: "take-a.mp4",
  original_filename: "take-a.mp4",
  stored_filename: "take-a-stored.mp4",
  notes: "first render",
};

const take: ShotTake = {
  id: 20,
  project_id: 1,
  shot_id: 1,
  take_label: "Take A",
  status: "Ready for review",
  source_type: "manual_upload",
  prompt_snapshot: "Video prompt:\ngentle magical camera move",
  negative_prompt_snapshot: "no violence, no horror",
  start_frame_asset_id: null,
  end_frame_asset_id: null,
  video_asset_id: 10,
  audio_asset_id: null,
  subtitle_asset_id: null,
  provider_job_id: null,
  review_notes: "Looks close.",
  visual_quality_score: 3,
  motion_quality_score: 4,
  character_consistency_score: 5,
  location_continuity_score: 4,
  safety_score: 5,
  approved_for_final: true,
  rejected_reason: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
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
    apiMock.listShotTakes.mockResolvedValue([]);
    apiMock.createShotTake.mockResolvedValue(take);
    apiMock.updateShotTake.mockResolvedValue(take);
    apiMock.deleteShotTake.mockResolvedValue(undefined);
    apiMock.approveShotTake.mockResolvedValue(take);
    apiMock.rejectShotTake.mockResolvedValue({ ...take, status: "Rejected", approved_for_final: false });
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
        onTakeChanged={vi.fn()}
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
        onTakeChanged={vi.fn()}
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
        onTakeChanged={vi.fn()}
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
        onTakeChanged={vi.fn()}
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
        onTakeChanged={vi.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getAllByLabelText("Status")[0], "Approved");
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
        onTakeChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("Attached assets")).toBeInTheDocument();
    expect(screen.getAllByText("start.png")[0]).toBeInTheDocument();
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
        onTakeChanged={vi.fn()}
      />,
    );

    await userEvent.clear(await screen.findByLabelText("Character consistency"));
    await userEvent.type(screen.getByLabelText("Character consistency"), "5");
    await userEvent.type(screen.getAllByLabelText("Review notes")[0], "Looks consistent.");
    await userEvent.click(screen.getByLabelText("Final approval readiness"));
    await userEvent.click(screen.getByRole("button", { name: /save quality gate/i }));

    expect(apiMock.saveShotQualityReview).toHaveBeenCalledWith(1, expect.objectContaining({
      character_consistency_score: 5,
      review_notes: "Looks consistent.",
      approved_for_final: true,
    }));
    expect(onQualityReviewSaved).toHaveBeenCalled();
  });

  it("renders the takes empty state and creates a take", async () => {
    const onTakeChanged = vi.fn().mockResolvedValue(undefined);
    render(
      <ShotList
        shots={[shot]}
        assets={[generatedVideo]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
        onTakeChanged={onTakeChanged}
      />,
    );

    expect(await screen.findByText(/No takes yet/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Generated video"), "10");
    await userEvent.click(screen.getByRole("button", { name: /create take/i }));

    expect(apiMock.createShotTake).toHaveBeenCalledWith(1, expect.objectContaining({ video_asset_id: 10 }));
    expect(onTakeChanged).toHaveBeenCalled();
  });

  it("renders take list and approve/reject/delete actions", async () => {
    apiMock.listShotTakes.mockResolvedValue([take]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ShotList
        shots={[shot]}
        assets={[generatedVideo]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
        onTakeChanged={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(await screen.findByText("Take A")).toBeInTheDocument();
    expect(screen.getByText(/Approved final take/i)).toBeInTheDocument();
    expect(screen.getByText(/Video: take-a.mp4/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(apiMock.approveShotTake).toHaveBeenCalledWith(20);
    expect(apiMock.rejectShotTake).toHaveBeenCalledWith(20, "");
    expect(confirm).toHaveBeenCalledWith("Delete Take A? Linked assets will stay in the project.");
    expect(apiMock.deleteShotTake).toHaveBeenCalledWith(20);
    confirm.mockRestore();
  });

  it("copies take prompt snapshot with feedback", async () => {
    apiMock.listShotTakes.mockResolvedValue([take]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <ShotList
        shots={[shot]}
        assets={[generatedVideo]}
        targetRuntime={180}
        projectId={1}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onPromptsApplied={vi.fn()}
        onQualityReviewSaved={vi.fn()}
        onTakeChanged={vi.fn()}
      />,
    );

    await screen.findByText("Take A");
    await userEvent.click(screen.getByRole("button", { name: /copy prompt snapshot/i }));

    expect(writeText).toHaveBeenCalledWith(take.prompt_snapshot);
    expect(screen.getByRole("button", { name: /copied snapshot/i })).toBeInTheDocument();
  });
});
