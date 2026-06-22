import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { AudioPlan, GeneratedStoryPackage, Shot, StoryWorkspace } from "../types";
import { AIStoryPanel } from "./AIStoryPanel";

vi.mock("../api/client", () => ({
  api: {
    previewStoryPackage: vi.fn(),
    applyStoryPackage: vi.fn(),
  },
}));

const emptyWorkspace: StoryWorkspace = {
  logline: "",
  synopsis: "",
  three_act_structure: "",
  cinematic_screenplay: "",
  simple_dialogue_version: "",
  voiceover_draft: "",
  subtitle_draft: "",
};

const emptyAudio: AudioPlan = {
  music_prompt: "",
  sound_effects_list: "",
  voiceover_script: "",
  subtitle_script: "",
  audio_notes: "",
};

const packagePreview: GeneratedStoryPackage = {
  logline: "Two friends light a floating garden.",
  synopsis: "Mia and Jo find a glowing compass and solve a gentle garden mystery.",
  three_act_structure: "Act 1 discovery, Act 2 clues, Act 3 cozy return.",
  cinematic_screenplay: "EXT. TREEHOUSE - DAY",
  simple_dialogue_version: "MIA: Together!",
  voiceover_draft: "They learned teamwork lights the way.",
  subtitle_draft: "The compass glowed softly.",
  suggested_characters: [
    {
      name: "Mia",
      role: "inventor",
      age: "7",
      appearance: "",
      outfit: "",
      personality: "",
      voice_style: "",
      continuity_prompt: "",
      negative_prompt: "",
      notes: "",
    },
  ],
  suggested_locations: [
    {
      name: "Floating Garden",
      description: "soft glowing flowers",
      mood: "wonder",
      lighting: "",
      color_palette: "",
      continuity_prompt: "",
      negative_prompt: "",
      safety_notes: "",
      notes: "",
    },
  ],
  shot_storyboard: [
    {
      shot_number: 1,
      scene_number: 1,
      duration_seconds: 6,
      purpose: "Opening",
      camera_framing: "wide",
      camera_movement: "push",
      characters_present: "Mia",
      location_name: "Treehouse",
      action: "Mia sees the compass",
      emotion: "wonder",
      notes: "",
    },
  ],
  audio_plan: {
    music_prompt: "gentle marimba",
    sound_effects_list: "sparkles",
  },
  safety_review: {
    final_safety_review_notes: "Age 4+ safe.",
  },
};

const shot: Shot = {
  id: 1,
  project_id: 1,
  shot_number: 1,
  scene_number: 1,
  duration_seconds: 6,
  purpose: "Manual shot",
  camera_framing: "",
  camera_movement: "",
  characters_present: "",
  location_name: "",
  action: "",
  emotion: "",
  image_prompt: "",
  start_frame_prompt: "",
  end_frame_prompt: "",
  video_prompt: "",
  negative_prompt: "",
  status: "Draft",
  notes: "",
};

describe("AIStoryPanel", () => {
  beforeEach(() => {
    vi.mocked(api.previewStoryPackage).mockReset();
    vi.mocked(api.applyStoryPackage).mockReset();
  });

  it("renders the generate button", () => {
    render(<AIStoryPanel projectId={1} workspace={emptyWorkspace} audio={emptyAudio} shots={[]} onApplied={vi.fn()} />);

    expect(screen.getByRole("button", { name: /generate story package/i })).toBeInTheDocument();
    expect(screen.getByText(/uses your backend openai key only/i)).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    vi.mocked(api.previewStoryPackage).mockReturnValue(new Promise(() => undefined));
    render(<AIStoryPanel projectId={1} workspace={emptyWorkspace} audio={emptyAudio} shots={[]} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate story package/i }));

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing story interview");
    expect(screen.getByText(/backend sends one structured openai request/i)).toBeInTheDocument();
  });

  it("renders preview sections", async () => {
    vi.mocked(api.previewStoryPackage).mockResolvedValue(packagePreview);
    render(<AIStoryPanel projectId={1} workspace={emptyWorkspace} audio={emptyAudio} shots={[]} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate story package/i }));

    expect(await screen.findByText("Two friends light a floating garden.")).toBeInTheDocument();
    expect(screen.getByText("1 character suggestions")).toBeInTheDocument();
    expect(screen.getByText("1 storyboard shots")).toBeInTheDocument();
  });

  it("apply action calls backend", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);
    vi.mocked(api.previewStoryPackage).mockResolvedValue(packagePreview);
    vi.mocked(api.applyStoryPackage).mockResolvedValue({
      applied: ["logline"],
      skipped: [],
      created_characters: 1,
      created_locations: 1,
      created_shots: 0,
    });
    render(<AIStoryPanel projectId={1} workspace={emptyWorkspace} audio={emptyAudio} shots={[]} onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /generate story package/i }));
    await screen.findByText("Two friends light a floating garden.");
    await userEvent.click(screen.getByRole("button", { name: /apply checked sections/i }));

    expect(api.applyStoryPackage).toHaveBeenCalledWith(1, expect.objectContaining({ package: packagePreview }));
    expect(onApplied).toHaveBeenCalled();
  });

  it("shows overwrite warning when existing content is present", () => {
    render(
      <AIStoryPanel
        projectId={1}
        workspace={{ ...emptyWorkspace, logline: "Manual logline" }}
        audio={emptyAudio}
        shots={[shot]}
        onApplied={vi.fn()}
      />,
    );

    expect(screen.getByText(/existing story, audio, or shot content found/i)).toBeInTheDocument();
  });

  it("renders provider error message", async () => {
    vi.mocked(api.previewStoryPackage).mockRejectedValue(new Error("OpenAI API key is not configured."));
    render(<AIStoryPanel projectId={1} workspace={emptyWorkspace} audio={emptyAudio} shots={[]} onApplied={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /generate story package/i }));

    expect(await screen.findByText("OpenAI API key is not configured.")).toBeInTheDocument();
  });
});
