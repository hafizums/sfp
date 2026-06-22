import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { Asset, AudioPlan, Character, Location, ProductionBible, Project, StoryInterview, StoryWorkspace } from "../types";
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
    createCharacter: vi.fn(),
    updateCharacter: vi.fn(),
    deleteCharacter: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    uploadAsset: vi.fn(),
    deleteAsset: vi.fn(),
    assetFileUrl: vi.fn(),
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
  visual_style: "soft paper diorama",
  color_palette: "mint, gold, sky blue",
  lighting_style: "warm miniature lighting",
  camera_language: "gentle cinematic framing",
  character_consistency_rules: "keep outfits and silhouettes stable",
  location_consistency_rules: "keep geography and lighting direction stable",
  prop_consistency_rules: "",
  safety_rules: "age 4+ safe, no scary danger",
  negative_prompt_rules: "no text, no logos, no watermarks",
  music_style: "",
  voiceover_style: "",
  subtitle_style: "",
  final_delivery_specs: "16:9 private local planning",
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

const character: Character = {
  id: 1,
  project_id: 1,
  name: "Mia",
  role: "curious inventor",
  age: "7",
  appearance: "bright eyes",
  outfit: "yellow raincoat",
  personality: "kind and curious",
  voice_style: "gentle",
  continuity_prompt: "Mia, yellow raincoat, bright eyes",
  negative_prompt: "no scary expression",
  notes: "Main character",
  anchor_asset_id: null,
  anchor_locked: false,
  face_identity_notes: "",
  outfit_lock_notes: "",
  color_palette_notes: "",
  prop_notes: "",
  anchor_review_notes: "",
};

const secondCharacter: Character = {
  ...character,
  id: 2,
  name: "Jo",
  role: "careful map reader",
  continuity_prompt: "Jo, blue backpack, careful map reader",
};

const characterAsset: Asset = {
  id: 1,
  project_id: 1,
  shot_id: null,
  asset_type: "character_reference",
  filename_or_path: "mia.png",
  original_filename: "mia.png",
  stored_filename: "stored-mia.png",
  relative_path: "assets/stored-mia.png",
  mime_type: "image/png",
  size_bytes: 128,
  preview_url: "/api/assets/1/file",
  download_url: "/api/assets/1/file",
  notes: "Mia front reference",
  created_at: "2026-01-01T00:00:00Z",
};

const assignedCharacterAsset: Asset = {
  ...characterAsset,
  id: 3,
  filename_or_path: "mia-portrait.png",
  original_filename: "mia-portrait.png",
  stored_filename: "stored-mia-portrait.png",
  notes: "[character_id:1] Mia portrait",
};

const location: Location = {
  id: 1,
  project_id: 1,
  name: "Floating Garden",
  description: "soft glowing flowers on a safe floating island",
  mood: "wonder",
  lighting: "golden afternoon",
  color_palette: "mint, gold, sky blue",
  continuity_prompt: "Floating Garden, glowing flowers, soft golden light",
  negative_prompt: "no dark horror mood",
  safety_notes: "gentle paths and no danger",
  notes: "Main adventure location",
  anchor_asset_id: null,
  anchor_locked: false,
  layout_notes: "",
  lighting_lock_notes: "",
  color_palette_notes: "",
  geography_notes: "",
  anchor_review_notes: "",
};

const secondLocation: Location = {
  ...location,
  id: 2,
  name: "Treehouse",
  description: "cozy backyard treehouse with warm lanterns",
  continuity_prompt: "Treehouse, warm lanterns, cozy wood",
};

const locationAsset: Asset = {
  ...characterAsset,
  id: 2,
  asset_type: "location_reference",
  filename_or_path: "garden.png",
  original_filename: "garden.png",
  stored_filename: "stored-garden.png",
  notes: "Garden wide reference",
};

const assignedLocationAsset: Asset = {
  ...locationAsset,
  id: 4,
  filename_or_path: "garden-wide.png",
  original_filename: "garden-wide.png",
  stored_filename: "stored-garden-wide.png",
  notes: "[location_id:1] Garden wide angle",
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
    vi.mocked(api.createCharacter).mockResolvedValue(character);
    vi.mocked(api.updateCharacter).mockResolvedValue(character);
    vi.mocked(api.deleteCharacter).mockResolvedValue(undefined);
    vi.mocked(api.createLocation).mockResolvedValue(location);
    vi.mocked(api.updateLocation).mockResolvedValue(location);
    vi.mocked(api.deleteLocation).mockResolvedValue(undefined);
    vi.mocked(api.uploadAsset).mockResolvedValue(characterAsset);
    vi.mocked(api.deleteAsset).mockResolvedValue(undefined);
    vi.mocked(api.assetFileUrl).mockReturnValue("http://127.0.0.1:8010/api/assets/1/file");
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

  it("copies draft, per-character, and combined prompts and uploads character assets", async () => {
    vi.mocked(api.listCharacters).mockResolvedValue([character, secondCharacter]);
    vi.mocked(api.uploadAsset)
      .mockResolvedValueOnce(characterAsset)
      .mockResolvedValueOnce(assignedCharacterAsset);
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ProjectWorkspace project={project} onRefreshProject={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Characters" }));
    await screen.findAllByLabelText("Name");
    await user.type(screen.getAllByLabelText("Name")[0], "Lina");
    await user.type(screen.getAllByLabelText("Role")[0], "brave lantern keeper");
    await user.type(screen.getAllByLabelText("Appearance")[0], "round glasses and a green jacket");
    await user.click(screen.getByRole("button", { name: /copy character prompt/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Character name: Lina"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Appearance: round glasses and a green jacket"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Production Bible context:"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Visual style: soft paper diorama"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Character consistency rules: keep outfits and silhouettes stable"));

    await user.click(screen.getByRole("button", { name: /copy combined prompt/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Character name: Mia"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Character name: Jo"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Negative prompt rules: no text, no logos, no watermarks"));

    await user.click(screen.getAllByRole("button", { name: /^copy prompt$/i })[0]);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Continuity prompt: Mia, yellow raincoat, bright eyes"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Final delivery specs: 16:9 private local planning"));

    const file = new File(["fake"], "mia.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Character asset"), file);
    await user.type(screen.getByPlaceholderText("Character name, pose, outfit, reference use"), "Mia front reference");
    await user.click(screen.getByRole("button", { name: /upload character asset/i }));

    expect(api.uploadAsset).toHaveBeenCalledWith(1, {
      asset_type: "character_reference",
      shot_id: null,
      notes: "Mia front reference",
      file,
    });
    expect(await screen.findByText("mia.png")).toBeInTheDocument();

    const portrait = new File(["fake"], "mia-portrait.png", { type: "image/png" });
    await user.upload(screen.getAllByLabelText("Character image")[0], portrait);
    await user.type(screen.getAllByPlaceholderText("Pose, expression, outfit, angle")[0], "Mia portrait");
    await user.click(screen.getAllByRole("button", { name: /upload image/i })[0]);

    expect(api.uploadAsset).toHaveBeenCalledWith(1, {
      asset_type: "character_reference",
      shot_id: null,
      notes: "[character_id:1] Mia portrait",
      file: portrait,
    });
    expect((await screen.findAllByText("mia-portrait.png")).length).toBeGreaterThan(0);
  }, 10000);

  it("renders character anchors and locks/unlocks anchor fields", async () => {
    vi.mocked(api.listCharacters).mockResolvedValue([{ ...character, anchor_asset_id: characterAsset.id }]);
    vi.mocked(api.listAssets).mockResolvedValue([characterAsset]);
    vi.mocked(api.updateCharacter)
      .mockResolvedValueOnce({ ...character, anchor_asset_id: characterAsset.id, anchor_locked: true })
      .mockResolvedValueOnce({ ...character, anchor_asset_id: characterAsset.id, anchor_locked: false });
    const user = userEvent.setup();
    render(<ProjectWorkspace project={project} onRefreshProject={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Characters" }));
    const selector = await screen.findByLabelText("Character anchor asset");
    expect(selector).toHaveValue(String(characterAsset.id));
    expect(screen.getByLabelText("Anchor preview")).toHaveTextContent("mia.png");
    expect(screen.getByText(/Use approved anchor images to keep face, outfit, and props consistent/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Face identity notes"), "round face");
    await user.click(screen.getByRole("button", { name: "Lock Anchor" }));

    expect(api.updateCharacter).toHaveBeenCalledWith(1, expect.objectContaining({
      anchor_asset_id: characterAsset.id,
      anchor_locked: true,
      face_identity_notes: "round face",
    }));
    expect(await screen.findByText("Anchor locked")).toBeInTheDocument();
    expect(screen.getByLabelText("Face identity notes")).toBeDisabled();
    expect(screen.getByLabelText("Character anchor asset")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Unlock Anchor" }));
    expect(api.updateCharacter).toHaveBeenLastCalledWith(1, { anchor_locked: false });
  });

  it("copies draft, per-location, and combined prompts and uploads location assets", async () => {
    vi.mocked(api.listLocations).mockResolvedValue([location, secondLocation]);
    vi.mocked(api.uploadAsset)
      .mockResolvedValueOnce(locationAsset)
      .mockResolvedValueOnce(assignedLocationAsset);
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<ProjectWorkspace project={project} onRefreshProject={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Locations" }));
    await screen.findAllByLabelText("Name");
    await user.type(screen.getAllByLabelText("Name")[0], "Sky Garden");
    await user.type(screen.getAllByLabelText("Description")[0], "floating terraces with soft flowers");
    await user.type(screen.getAllByLabelText("Lighting")[0], "warm sunrise");
    await user.click(screen.getByRole("button", { name: /copy location prompt/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Location name: Sky Garden"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Lighting: warm sunrise"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Production Bible context:"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Location consistency rules: keep geography and lighting direction stable"));

    await user.click(screen.getByRole("button", { name: /copy combined prompt/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Location name: Floating Garden"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Location name: Treehouse"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Camera language: gentle cinematic framing"));

    await user.click(screen.getAllByRole("button", { name: /^copy prompt$/i })[0]);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Continuity prompt: Floating Garden, glowing flowers, soft golden light"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Safety rules: age 4+ safe, no scary danger"));

    const file = new File(["fake"], "garden.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Location asset"), file);
    await user.type(screen.getByPlaceholderText("Location name, angle, mood, reference use"), "Garden wide reference");
    await user.click(screen.getByRole("button", { name: /upload location asset/i }));

    expect(api.uploadAsset).toHaveBeenCalledWith(1, {
      asset_type: "location_reference",
      shot_id: null,
      notes: "Garden wide reference",
      file,
    });
    expect(await screen.findByText("garden.png")).toBeInTheDocument();

    const wide = new File(["fake"], "garden-wide.png", { type: "image/png" });
    await user.upload(screen.getAllByLabelText("Location image")[0], wide);
    await user.type(screen.getAllByPlaceholderText("Angle, lighting, mood, reference use")[0], "Garden wide angle");
    await user.click(screen.getAllByRole("button", { name: /upload image/i })[0]);

    expect(api.uploadAsset).toHaveBeenCalledWith(1, {
      asset_type: "location_reference",
      shot_id: null,
      notes: "[location_id:1] Garden wide angle",
      file: wide,
    });
    expect((await screen.findAllByText("garden-wide.png")).length).toBeGreaterThan(0);
  }, 10000);

  it("renders location anchors and locks/unlocks anchor fields", async () => {
    vi.mocked(api.listLocations).mockResolvedValue([{ ...location, anchor_asset_id: locationAsset.id }]);
    vi.mocked(api.listAssets).mockResolvedValue([locationAsset]);
    vi.mocked(api.updateLocation)
      .mockResolvedValueOnce({ ...location, anchor_asset_id: locationAsset.id, anchor_locked: true })
      .mockResolvedValueOnce({ ...location, anchor_asset_id: locationAsset.id, anchor_locked: false });
    const user = userEvent.setup();
    render(<ProjectWorkspace project={project} onRefreshProject={vi.fn().mockResolvedValue(undefined)} />);

    await user.click(screen.getByRole("button", { name: "Locations" }));
    const selector = await screen.findByLabelText("Location anchor asset");
    expect(selector).toHaveValue(String(locationAsset.id));
    expect(screen.getByLabelText("Anchor preview")).toHaveTextContent("garden.png");
    expect(screen.getByText(/Use approved anchor images to keep layout, lighting, and geography consistent/i)).toBeInTheDocument();

    const locationAnchor = screen.getByLabelText("Floating Garden location anchor");
    await user.type(within(locationAnchor).getByLabelText("Layout notes"), "bridge right");
    await user.click(within(locationAnchor).getByRole("button", { name: "Lock Anchor" }));

    expect(api.updateLocation).toHaveBeenCalledWith(1, expect.objectContaining({
      anchor_asset_id: locationAsset.id,
      anchor_locked: true,
      layout_notes: "bridge right",
    }));
    expect(await screen.findByText("Anchor locked")).toBeInTheDocument();
    expect(screen.getByLabelText("Layout notes")).toBeDisabled();
    expect(screen.getByLabelText("Location anchor asset")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Unlock Anchor" }));
    expect(api.updateLocation).toHaveBeenLastCalledWith(1, { anchor_locked: false });
  });
});
