import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShotList } from "./ShotList";
import type { Shot } from "../types";

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

describe("ShotList", () => {
  it("copies a Wan 2.2 prompt package for the selected shot", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <ShotList
        shots={[shot]}
        targetRuntime={180}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
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
        targetRuntime={180}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
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
        targetRuntime={180}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={onReorder}
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
        targetRuntime={180}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]);

    expect(writeText).toHaveBeenCalledWith("storybook treehouse");
  });

  it("saves status changes", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <ShotList
        shots={[shot]}
        targetRuntime={180}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Status"), "Approved");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ status: "Approved" }));
  });
});
