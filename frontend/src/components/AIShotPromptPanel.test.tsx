import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { GeneratedShotPromptPackage, Shot } from "../types";
import { AIShotPromptPanel } from "./AIShotPromptPanel";

vi.mock("../api/client", () => ({
  api: {
    previewShotPrompts: vi.fn(),
    applyShotPrompts: vi.fn(),
  },
}));

const shot: Shot = {
  id: 1,
  project_id: 1,
  shot_number: 1,
  scene_number: 1,
  duration_seconds: 6,
  purpose: "Open the glowing door",
  camera_framing: "wide",
  camera_movement: "slow push",
  characters_present: "Mia",
  location_name: "Treehouse",
  action: "Mia opens the tiny door",
  emotion: "wonder",
  image_prompt: "",
  start_frame_prompt: "",
  end_frame_prompt: "",
  video_prompt: "",
  negative_prompt: "",
  status: "Draft",
  notes: "",
};

const packagePreview: GeneratedShotPromptPackage = {
  shot_id: 1,
  shot_number: 1,
  image_prompt: "16:9 cinematic frame of Mia at a glowing treehouse door",
  start_frame_prompt: "Mia reaches toward the tiny glowing door",
  end_frame_prompt: "Warm lights float from the open doorway",
  video_prompt: "Slow push-in as Mia gently opens the door and floating lights drift out",
  negative_prompt: "no violence, no horror, no blood, no weapons, no text, no logos, no watermarks",
  notes: "Keep the mood gentle and magical.",
};

describe("AIShotPromptPanel", () => {
  beforeEach(() => {
    vi.mocked(api.previewShotPrompts).mockReset();
    vi.mocked(api.applyShotPrompts).mockReset();
  });

  it("renders the generate Wan 2.2 prompts button", () => {
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    expect(screen.getByRole("button", { name: /generate wan 2.2 prompts/i })).toBeInTheDocument();
    expect(screen.getByText(/uses your backend openai key only/i)).toBeInTheDocument();
    expect(screen.getByText(/guided interview is not required/i)).toBeInTheDocument();
  });

  it("renders the strict Wan framework helper text", () => {
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    expect(screen.getByText(/strict framework: cast count, locked camera\/framing, action timeline, and motion boundaries/i)).toBeInTheDocument();
  });

  it("renders the GPT image prompt helper text", () => {
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    expect(screen.getByText(/image prompts are optimized for gpt image generation: storyboard still, exact start frame, and exact end frame/i)).toBeInTheDocument();
  });

  it("renders the locked anchor helper text", () => {
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    expect(screen.getByText(/locked character and location anchors/i)).toBeInTheDocument();
    expect(screen.getByText(/anchor images are not sent to openai/i)).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    vi.mocked(api.previewShotPrompts).mockReturnValue(new Promise(() => undefined));
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate wan 2.2 prompts/i }));

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Collecting shot context");
  });

  it("renders preview prompt packages", async () => {
    vi.mocked(api.previewShotPrompts).mockResolvedValue([packagePreview]);
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate wan 2.2 prompts/i }));

    expect(await screen.findByText("Shot 1")).toBeInTheDocument();
    expect(screen.getByText(packagePreview.image_prompt)).toBeInTheDocument();
    expect(screen.getByText(packagePreview.negative_prompt)).toBeInTheDocument();
  });

  it("apply action calls backend", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);
    vi.mocked(api.previewShotPrompts).mockResolvedValue([packagePreview]);
    vi.mocked(api.applyShotPrompts).mockResolvedValue({ applied: ["shot 1 image_prompt"], skipped: [], updated_shots: 1 });
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /generate wan 2.2 prompts/i }));
    await screen.findByText(packagePreview.image_prompt);
    await userEvent.click(screen.getByRole("button", { name: /apply selected prompt packages/i }));

    expect(api.applyShotPrompts).toHaveBeenCalledWith(1, { packages: [packagePreview], overwrite: false });
    expect(onApplied).toHaveBeenCalled();
  });

  it("shows overwrite warning when selected shots already have prompt fields", () => {
    render(
      <AIShotPromptPanel
        projectId={1}
        shots={[{ ...shot, image_prompt: "manual prompt" }]}
        selectedShotId={1}
        onApplied={vi.fn()}
      />,
    );

    expect(screen.getByText(/selected shots already contain prompt fields/i)).toBeInTheDocument();
  });

  it("renders provider error message", async () => {
    vi.mocked(api.previewShotPrompts).mockRejectedValue(new Error("OpenAI prompt request timed out."));
    render(<AIShotPromptPanel projectId={1} shots={[shot]} selectedShotId={1} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate wan 2.2 prompts/i }));

    expect(await screen.findByText("OpenAI prompt request timed out.")).toBeInTheDocument();
  });

  it("disables generation and explains no-shot state", () => {
    render(<AIShotPromptPanel projectId={1} shots={[]} selectedShotId={null} onApplied={vi.fn()} />);

    expect(screen.getByRole("button", { name: /generate wan 2.2 prompts/i })).toBeDisabled();
    expect(screen.getByText(/add storyboard shots before generating/i)).toBeInTheDocument();
    expect(screen.getByText(/strict framework: cast count/i)).toBeInTheDocument();
    expect(screen.getByText(/gpt image generation: storyboard still/i)).toBeInTheDocument();
    expect(screen.getByText(/locked character and location anchors/i)).toBeInTheDocument();
  });
});
