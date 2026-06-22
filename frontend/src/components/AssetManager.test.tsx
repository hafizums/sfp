import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { Asset, Shot } from "../types";
import { AssetGrid, AssetManager } from "./AssetManager";

vi.mock("../api/client", () => ({
  api: {
    uploadAsset: vi.fn(),
    createAsset: vi.fn(),
    deleteAsset: vi.fn(),
    listAssets: vi.fn(),
    assetFileUrl: vi.fn((asset: Asset) => asset.preview_url),
  },
}));

const shot: Shot = {
  id: 1,
  project_id: 1,
  shot_number: 1,
  scene_number: 1,
  duration_seconds: 6,
  purpose: "Opening",
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

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    project_id: 1,
    shot_id: null,
    asset_type: "character_reference",
    filename_or_path: "reference.png",
    original_filename: "reference.png",
    stored_filename: "stored.png",
    relative_path: "project_1/stored.png",
    mime_type: "image/png",
    size_bytes: 12,
    preview_url: "/api/assets/1/file",
    download_url: "/api/assets/1/file",
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function Harness({ initialAssets = [] }: { initialAssets?: Asset[] }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  return <AssetManager projectId={1} shots={[shot]} assets={assets} onAssetsChange={setAssets} />;
}

describe("AssetManager", () => {
  beforeEach(() => {
    vi.mocked(api.uploadAsset).mockReset();
    vi.mocked(api.createAsset).mockReset();
    vi.mocked(api.deleteAsset).mockReset();
    vi.mocked(api.listAssets).mockReset();
    vi.mocked(api.assetFileUrl).mockClear();
  });

  it("renders upload form", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: /upload asset/i })).toBeInTheDocument();
    expect(screen.getByLabelText("File")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload type")).toBeInTheDocument();
  });

  it("asset type selector works", async () => {
    render(<Harness />);

    await userEvent.selectOptions(screen.getByLabelText("Upload type"), "generated_video");

    expect(screen.getByLabelText("Upload type")).toHaveValue("generated_video");
  });

  it("shot selector appears and works", async () => {
    render(<Harness />);

    await userEvent.selectOptions(screen.getAllByLabelText("Attach to")[0], "1");

    expect(screen.getAllByLabelText("Attach to")[0]).toHaveValue("1");
  });

  it("uploaded asset list renders from API response", async () => {
    vi.mocked(api.uploadAsset).mockResolvedValue(asset());
    vi.mocked(api.listAssets).mockResolvedValue([asset()]);
    render(<Harness />);

    await userEvent.upload(screen.getByLabelText("File"), new File(["tiny"], "reference.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: /upload asset/i }));

    expect(await screen.findByText("reference.png")).toBeInTheDocument();
    expect(api.uploadAsset).toHaveBeenCalledWith(1, expect.objectContaining({ asset_type: "character_reference" }));
  });

  it("preview renders image video and audio media", () => {
    const { container } = render(
      <AssetGrid
        shots={[shot]}
        onDelete={vi.fn()}
        assets={[
          asset({ id: 1, original_filename: "still.png", mime_type: "image/png", preview_url: "/api/assets/1/file" }),
          asset({ id: 2, original_filename: "clip.mp4", mime_type: "video/mp4", preview_url: "/api/assets/2/file" }),
          asset({ id: 3, original_filename: "music.mp3", mime_type: "audio/mpeg", preview_url: "/api/assets/3/file" }),
        ]}
      />,
    );

    expect(container.querySelector("img")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeInTheDocument();
    expect(container.querySelector("audio")).toBeInTheDocument();
  });

  it("delete confirmation calls API", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.deleteAsset).mockResolvedValue(undefined);
    vi.mocked(api.listAssets).mockResolvedValue([]);
    render(<Harness initialAssets={[asset()]} />);

    const card = screen.getByText("reference.png").closest("article");
    await userEvent.click(within(card as HTMLElement).getByRole("button", { name: /delete/i }));

    expect(confirm).toHaveBeenCalledWith('Delete "reference.png" and remove its local file if uploaded?');
    expect(api.deleteAsset).toHaveBeenCalledWith(1);
    confirm.mockRestore();
  });
});
