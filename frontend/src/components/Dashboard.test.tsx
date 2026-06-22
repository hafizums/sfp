import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Dashboard } from "./Dashboard";
import type { Project } from "../types";

const project: Project = {
  id: 1,
  title: "Lantern Island",
  genre: "Kids Adventure",
  target_runtime_seconds: 180,
  audience_age: "4+",
  tone: "fun, magical, safe, teamwork",
  aspect_ratio: "16:9",
  visual_style: "storybook 3D",
  safety_rules: ["No violence"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  current_planned_runtime: 24,
  shot_count: 6,
  progress: 50,
  production_bible_locked: true,
  quality_review_count: 4,
  shots_approved_for_final: 2,
  take_count: 3,
  shots_with_approved_take: 2,
  final_edit_readiness_percent: 33,
};

describe("Dashboard", () => {
  it("shows project metrics and creates a project", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <Dashboard
        projects={[project]}
        selectedProjectId={1}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Lantern Island")).toBeInTheDocument();
    expect(screen.getByText("24s / 180s")).toBeInTheDocument();
    expect(screen.getByText("6 shots")).toBeInTheDocument();
    expect(screen.getByText("50% progress")).toBeInTheDocument();
    expect(screen.getByText("Bible locked")).toBeInTheDocument();
    expect(screen.getByText("2/6 final-ready")).toBeInTheDocument();
    expect(screen.getByText("3 takes")).toBeInTheDocument();
    expect(screen.getByText("33% edit ready")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "Moon Map");
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "Moon Map" }));
  });

  it("edits a project and deletes only after confirmation", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <Dashboard
        projects={[project]}
        selectedProjectId={1}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "Lantern Island Rescue");
    await userEvent.click(screen.getByRole("button", { name: /save project/i }));

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ title: "Lantern Island Rescue" }));

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(confirm).toHaveBeenCalledWith('Delete "Lantern Island"?');
    expect(onDelete).toHaveBeenCalledWith(1);
    confirm.mockRestore();
  });
});
