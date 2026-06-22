import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductionBiblePanel } from "./ProductionBiblePanel";
import type { ProductionBible } from "../types";

const apiMock = vi.hoisted(() => ({
  saveProductionBible: vi.fn(),
  lockProductionBible: vi.fn(),
  unlockProductionBible: vi.fn(),
}));

vi.mock("../api/client", () => ({
  api: apiMock,
}));

const bible: ProductionBible = {
  id: 1,
  project_id: 1,
  visual_style: "soft storybook 3D",
  color_palette: "mint and gold",
  lighting_style: "warm morning glow",
  camera_language: "gentle push-ins",
  character_consistency_rules: "Keep outfits stable.",
  location_consistency_rules: "Keep garden geography stable.",
  prop_consistency_rules: "Compass stays blue.",
  safety_rules: "No violence",
  negative_prompt_rules: "no text, no logos, no watermarks",
  music_style: "gentle marimba",
  voiceover_style: "warm narration",
  subtitle_style: "short simple lines",
  final_delivery_specs: "16:9, 180 seconds",
  locked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ProductionBiblePanel", () => {
  beforeEach(() => {
    apiMock.saveProductionBible.mockResolvedValue({ ...bible, visual_style: "paper diorama" });
    apiMock.lockProductionBible.mockResolvedValue({ ...bible, locked: true });
    apiMock.unlockProductionBible.mockResolvedValue({ ...bible, locked: false });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("renders sections and locks the bible", async () => {
    const onBibleChange = vi.fn();
    const onRefreshProject = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductionBiblePanel
        projectId={1}
        bible={bible}
        onBibleChange={onBibleChange}
        onRefreshProject={onRefreshProject}
      />,
    );

    expect(screen.getByText("Visual direction")).toBeInTheDocument();
    expect(screen.getByText("Continuity rules")).toBeInTheDocument();
    expect(screen.getByText("Use this as the source of truth for all shots and prompts.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /lock bible/i }));

    expect(apiMock.lockProductionBible).toHaveBeenCalledWith(1);
    expect(onBibleChange).toHaveBeenCalledWith(expect.objectContaining({ locked: true }));
    expect(onRefreshProject).toHaveBeenCalled();
  });

  it("disables fields when locked and allows unlock", async () => {
    const onBibleChange = vi.fn();
    render(
      <ProductionBiblePanel
        projectId={1}
        bible={{ ...bible, locked: true }}
        onBibleChange={onBibleChange}
        onRefreshProject={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByLabelText("Visual style")).toBeDisabled();
    expect(screen.getByLabelText("Negative prompt rules")).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /unlock bible/i }));

    expect(apiMock.unlockProductionBible).toHaveBeenCalledWith(1);
    expect(onBibleChange).toHaveBeenCalledWith(expect.objectContaining({ locked: false }));
  });

  it("saves edits and copies negative rules", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <ProductionBiblePanel
        projectId={1}
        bible={bible}
        onBibleChange={vi.fn()}
        onRefreshProject={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Visual style"));
    await userEvent.type(screen.getByLabelText("Visual style"), "paper diorama");
    await userEvent.click(screen.getByRole("button", { name: /save bible/i }));
    await userEvent.click(screen.getByRole("button", { name: /copy negative rules/i }));

    expect(apiMock.saveProductionBible).toHaveBeenCalledWith(1, expect.objectContaining({
      visual_style: "paper diorama",
    }));
    expect(writeText).toHaveBeenCalledWith("no text, no logos, no watermarks");
  });
});
