import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { api } from "../api/client";
import { assetTypes, type Asset, type AssetInput, type AssetType, type Shot } from "../types";

const emptyMetadata: AssetInput = {
  shot_id: null,
  asset_type: "other",
  filename_or_path: "",
  notes: "",
};

type UploadDraft = {
  asset_type: AssetType;
  shot_id: number | null;
  notes: string;
  file: File | null;
};

const emptyUpload: UploadDraft = {
  asset_type: "character_reference",
  shot_id: null,
  notes: "",
  file: null,
};

const assetTypeLabels: Record<AssetType, string> = {
  character_reference: "Character reference",
  location_reference: "Location reference",
  start_frame: "Start frame",
  end_frame: "End frame",
  generated_video: "Generated video",
  audio: "Audio",
  subtitle: "Subtitle",
  other: "Other",
};

type Props = {
  projectId: number;
  shots: Shot[];
  assets: Asset[];
  onAssetsChange: (assets: Asset[]) => void;
};

export function AssetManager({ projectId, shots, assets, onAssetsChange }: Props) {
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>(emptyUpload);
  const [metadataDraft, setMetadataDraft] = useState<AssetInput>(emptyMetadata);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadAsset() {
    if (!uploadDraft.file) {
      setError("Choose a file before uploading.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const asset = await api.uploadAsset(projectId, {
        asset_type: uploadDraft.asset_type,
        shot_id: uploadDraft.shot_id,
        notes: uploadDraft.notes,
        file: uploadDraft.file,
      });
      onAssetsChange([asset, ...assets]);
      setUploadDraft(emptyUpload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload asset.");
    } finally {
      setUploading(false);
    }
  }

  async function createMetadata() {
    const asset = await api.createAsset(projectId, metadataDraft);
    onAssetsChange([asset, ...assets]);
    setMetadataDraft(emptyMetadata);
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`Delete "${assetLabel(asset)}" and remove its local file if uploaded?`)) {
      return;
    }
    await api.deleteAsset(asset.id);
    onAssetsChange(assets.filter((item) => item.id !== asset.id));
  }

  return (
    <section className="workspace-band">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Production assets</p>
          <h2>Asset Upload and Preview</h2>
        </div>
      </div>
      <p className="muted-note">Upload generated images, video, audio, and subtitle files here. Files stay local and are served through the backend.</p>

      <form className="asset-upload-form" onSubmit={(event) => { event.preventDefault(); void uploadAsset(); }}>
        <label>Upload type<AssetTypeSelect value={uploadDraft.asset_type} onChange={(asset_type) => setUploadDraft({ ...uploadDraft, asset_type })} /></label>
        <label>Attach to<ShotSelect shots={shots} value={uploadDraft.shot_id} onChange={(shot_id) => setUploadDraft({ ...uploadDraft, shot_id })} /></label>
        <label>File<input type="file" onChange={(event) => setUploadDraft({ ...uploadDraft, file: event.target.files?.[0] ?? null })} /></label>
        <label>Notes<textarea value={uploadDraft.notes} onChange={(event) => setUploadDraft({ ...uploadDraft, notes: event.target.value })} /></label>
        <button className="primary" type="submit" disabled={uploading}><Upload size={16} /> {uploading ? "Uploading" : "Upload asset"}</button>
      </form>

      {error ? <div className="app-error">{error}</div> : null}

      <form className="asset-form" onSubmit={(event) => { event.preventDefault(); void createMetadata(); }}>
        <label>Tracked type<AssetTypeSelect value={metadataDraft.asset_type} onChange={(asset_type) => setMetadataDraft({ ...metadataDraft, asset_type })} /></label>
        <label>Attach to<ShotSelect shots={shots} value={metadataDraft.shot_id} onChange={(shot_id) => setMetadataDraft({ ...metadataDraft, shot_id })} /></label>
        <label>Filename or path<input value={metadataDraft.filename_or_path} onChange={(event) => setMetadataDraft({ ...metadataDraft, filename_or_path: event.target.value })} /></label>
        <label>Notes<textarea value={metadataDraft.notes} onChange={(event) => setMetadataDraft({ ...metadataDraft, notes: event.target.value })} /></label>
        <button className="ghost" type="submit"><Plus size={16} /> Track metadata</button>
      </form>

      <AssetGrid assets={assets} shots={shots} onDelete={(asset) => void deleteAsset(asset)} />
    </section>
  );
}

export function AssetGrid({ assets, shots, onDelete }: { assets: Asset[]; shots: Shot[]; onDelete: (asset: Asset) => void }) {
  if (!assets.length) {
    return <div className="empty-state">No assets yet. Upload generated files or track an external filename/path after you create project shots.</div>;
  }
  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <AssetPreviewCard key={asset.id} asset={asset} shot={shots.find((shot) => shot.id === asset.shot_id)} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function AssetPreviewCard({ asset, shot, onDelete }: { asset: Asset; shot?: Shot; onDelete?: (asset: Asset) => void }) {
  const fileUrl = api.assetFileUrl(asset);
  return (
    <article className="asset-card">
      <div className="asset-card-heading">
        <div>
          <strong>{assetLabel(asset)}</strong>
          <span>{assetTypeLabels[asset.asset_type]}{shot ? ` | Shot ${shot.shot_number}` : " | Project-level"}</span>
        </div>
        {onDelete ? <button className="danger" type="button" onClick={() => onDelete(asset)}><Trash2 size={16} /> Delete</button> : null}
      </div>
      <AssetPreview asset={asset} fileUrl={fileUrl} />
      <div className="asset-meta">
        <span>{asset.mime_type || "metadata only"}</span>
        <span>{asset.size_bytes ? formatBytes(asset.size_bytes) : "no file stored"}</span>
        {shot ? <span>Shot {shot.shot_number}: {shot.purpose || "Untitled shot"}</span> : <span>Project-level</span>}
      </div>
      {asset.notes ? <p>{asset.notes}</p> : null}
      {fileUrl ? <a className="asset-link" href={fileUrl} target="_blank" rel="noreferrer">Open file</a> : null}
    </article>
  );
}

function AssetPreview({ asset, fileUrl }: { asset: Asset; fileUrl: string }) {
  if (!fileUrl) {
    return <div className="asset-placeholder"><FileText size={20} /> {asset.filename_or_path}</div>;
  }
  if (asset.mime_type.startsWith("image/")) {
    return <img className="asset-preview-media" src={fileUrl} alt={assetLabel(asset)} />;
  }
  if (asset.mime_type.startsWith("video/")) {
    return <video className="asset-preview-media" src={fileUrl} controls />;
  }
  if (asset.mime_type.startsWith("audio/")) {
    return <audio className="asset-audio" src={fileUrl} controls />;
  }
  if (isTextAsset(asset)) {
    return <iframe className="asset-text-preview" src={fileUrl} title={assetLabel(asset)} />;
  }
  return <div className="asset-placeholder"><FileText size={20} /> {assetLabel(asset)}</div>;
}

function AssetTypeSelect({ value, onChange }: { value: AssetType; onChange: (value: AssetType) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as AssetType)}>
      {assetTypes.map((type) => <option key={type} value={type}>{assetTypeLabels[type]}</option>)}
    </select>
  );
}

function ShotSelect({ shots, value, onChange }: { shots: Shot[]; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
      <option value="">Project-level</option>
      {shots.map((shot) => <option key={shot.id} value={shot.id}>Shot {shot.shot_number}</option>)}
    </select>
  );
}

function assetLabel(asset: Asset): string {
  return asset.original_filename || asset.filename_or_path || asset.stored_filename || `Asset ${asset.id}`;
}

function isTextAsset(asset: Asset): boolean {
  return asset.mime_type.startsWith("text/") || asset.mime_type === "application/x-subrip";
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
