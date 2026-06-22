import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { AudioPlan, ProductionBible, Project, StoryInterview, StoryWorkspace } from "../types";
import { ProjectWorkspace } from "./ProjectWorkspace";

vi.mock("../api/client", () => ({
  api: {
    getStoryInterview: vi.fn(),
    getWorkspace: vi.fn(),
    getProductionBible: vi.fn(),
    listCharacters: vi.fn(),
    listLocations: vi.fn(),
    listShots: vi.fn(),
    listAssets: vi.fn(),
    getAudioPlan: vi.fn(),
    getChecklist: vi.fn(),
    saveStoryInterview: vi.fn(),
    saveWorkspace: vi.fn(),
    updateProject: vi.fn(),
  },
}));

const project: Project = {
  id: 1,
  title: "Lantern Island",
  genre: "Kids Adventure",
  target_runtime_seconds: 180,
  audience_age: "4+",
  tone: "fun, magical, safe, teamwork",
  aspect_ratio: "16:9",
  visual_style: "",
  safety_rules: ["No violence"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  current_planned_runtime: 0,
  shot_count: 0,
  progress: 0,
  production_bible_locked: false,
  quality_review_count: 0,
  shots_approved_for_final: 0,
  take_count: 0,
  shots_with_approved_take: 0,
  final_edit_readiness_percent: 0,
};

const interview: StoryInterview = {
  id: 1,
  project_id: 1,
  title_answer: "",
  magical_discovery: "",
  main_kid_characters: "",
  adventure_beginning: "",
  main_adventure_location: "",
  small_problem: "",
  teamwork_solution: "",
  ending_feel: "",
  visual_style: "",
  avoid: "",
};

const workspace: StoryWorkspace = {
  id: 1,
  project_id: 1,
  logline: "",
  synopsis: "",
  three_act_structure: "",
  cinematic_screenplay: "",
  simple_dialogue_version: "",
  voiceover_draft: "",
  subtitle_draft: "",
};

const productionBible: ProductionBible = {
  id: 1,
  project_id: 1,
  visual_style: "",
  color_palette: "",
  lighting_style: "",
  camera_language: "",
  character_consistency_rules: "",
  location_consistency_rules: "",
  prop_consistency_rules: "",
  safety_rules: "",
  negative_prompt_rules: "",
  music_style: "",
  voiceover_style: "",
  subtitle_style: "",
  final_delivery_specs: "",
  locked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const audio: AudioPlan = {
  id: 1,
  project_id: 1,
  music_prompt: "",
  sound_effects_list: "",
  voiceover_script: "",
  subtitle_script: "",
  audio_notes: "",
};

describe("ProjectWorkspace", () => {
  beforeEach(() => {
    vi.mocked(api.getStoryInterview).mockResolvedValue(interview);
    vi.mocked(api.getWorkspace).mockResolvedValue(workspace);
    vi.mocked(api.getProductionBible).mockResolvedValue(productionBible);
    vi.mocked(api.listCharacters).mockResolvedValue([]);
    vi.mocked(api.listLocations).mockResolvedValue([]);
    vi.mocked(api.listShots).mockResolvedValue([]);
    vi.mocked(api.listAssets).mockResolvedValue([]);
    vi.mocked(api.getAudioPlan).mockResolvedValue(audio);
    vi.mocked(api.getChecklist).mockResolvedValue([]);
    vi.mocked(api.saveStoryInterview).mockResolvedValue(interview);
    vi.mocked(api.saveWorkspace).mockResolvedValue(workspace);
    vi.mocked(api.updateProject).mockResolvedValue(project);
  });

  it("uses flexible workflow wording and marks interview optional", async () => {
    render(<ProjectWorkspace project={project} onRefreshProject={vi.fn().mockResolvedValue(undefined)} />);

    const workflow = screen.getByLabelText("Production workflow");
    expect(workflow).toHaveTextContent("Setup");
    expect(workflow).toHaveTextContent("Add story context");
    expect(workflow).toHaveTextContent("Build bible");
    expect(workflow).toHaveTextContent("Review takes");

    await userEvent.click(screen.getByRole("button", { name: "Interview" }));
    expect(await screen.findByText(/Optional guided interview/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Story" }));
    expect(screen.getAllByText(/generate from interview, manual story text, production bible, characters, locations, or existing shots/i).length).toBeGreaterThan(0);
  });
});
