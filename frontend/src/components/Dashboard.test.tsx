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

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "Moon Map");
    await userEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "Moon Map" }));
  });
});
