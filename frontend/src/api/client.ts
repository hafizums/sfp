import type {
  Asset,
  AssetInput,
  AssetUploadInput,
  AudioPlan,
  Character,
  CharacterInput,
  ChecklistItem,
  GeneratedStoryPackage,
  GeneratedShotPromptPackage,
  Location,
  LocationInput,
  Project,
  ProjectInput,
  ProductionBible,
  ProductionBibleInput,
  Shot,
  ShotInput,
  ShotQualityReview,
  ShotQualityReviewInput,
  ShotPromptApplyRequest,
  ShotPromptApplyResponse,
  ShotPromptPreviewRequest,
  StoryPackageApplyRequest,
  StoryPackageApplyResponse,
  StoryInterview,
  StoryWorkspace,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

const form = (body: FormData): RequestInit => ({ body });

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
  } catch {
    return text;
  }
  return text;
}

export const api = {
  listProjects: () => request<Project[]>("/projects"),
  createProject: (payload: ProjectInput) => request<Project>("/projects", { method: "POST", ...json(payload) }),
  updateProject: (id: number, payload: Partial<ProjectInput>) =>
    request<Project>(`/projects/${id}`, { method: "PUT", ...json(payload) }),
  deleteProject: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  getProject: (id: number) => request<Project>(`/projects/${id}`),

  getStoryInterview: (projectId: number) => request<StoryInterview>(`/projects/${projectId}/story-interview`),
  saveStoryInterview: (projectId: number, payload: StoryInterview) =>
    request<StoryInterview>(`/projects/${projectId}/story-interview`, { method: "PUT", ...json(payload) }),
  getWorkspace: (projectId: number) => request<StoryWorkspace>(`/projects/${projectId}/workspace`),
  saveWorkspace: (projectId: number, payload: StoryWorkspace) =>
    request<StoryWorkspace>(`/projects/${projectId}/workspace`, { method: "PUT", ...json(payload) }),
  getProductionBible: (projectId: number) => request<ProductionBible>(`/projects/${projectId}/production-bible`),
  saveProductionBible: (projectId: number, payload: Partial<ProductionBibleInput>) =>
    request<ProductionBible>(`/projects/${projectId}/production-bible`, { method: "PUT", ...json(payload) }),
  lockProductionBible: (projectId: number) =>
    request<ProductionBible>(`/projects/${projectId}/production-bible/lock`, { method: "POST" }),
  unlockProductionBible: (projectId: number) =>
    request<ProductionBible>(`/projects/${projectId}/production-bible/unlock`, { method: "POST" }),

  listCharacters: (projectId: number) => request<Character[]>(`/projects/${projectId}/characters`),
  createCharacter: (projectId: number, payload: CharacterInput) =>
    request<Character>(`/projects/${projectId}/characters`, { method: "POST", ...json(payload) }),
  updateCharacter: (id: number, payload: Partial<CharacterInput>) =>
    request<Character>(`/characters/${id}`, { method: "PUT", ...json(payload) }),
  deleteCharacter: (id: number) => request<void>(`/characters/${id}`, { method: "DELETE" }),

  listLocations: (projectId: number) => request<Location[]>(`/projects/${projectId}/locations`),
  createLocation: (projectId: number, payload: LocationInput) =>
    request<Location>(`/projects/${projectId}/locations`, { method: "POST", ...json(payload) }),
  updateLocation: (id: number, payload: Partial<LocationInput>) =>
    request<Location>(`/locations/${id}`, { method: "PUT", ...json(payload) }),
  deleteLocation: (id: number) => request<void>(`/locations/${id}`, { method: "DELETE" }),

  listShots: (projectId: number) => request<Shot[]>(`/projects/${projectId}/shots`),
  createShot: (projectId: number, payload: ShotInput) =>
    request<Shot>(`/projects/${projectId}/shots`, { method: "POST", ...json(payload) }),
  updateShot: (id: number, payload: Partial<ShotInput>) =>
    request<Shot>(`/shots/${id}`, { method: "PUT", ...json(payload) }),
  deleteShot: (id: number) => request<void>(`/shots/${id}`, { method: "DELETE" }),
  reorderShots: (projectId: number, shotIds: number[]) =>
    request<Shot[]>(`/projects/${projectId}/shots/reorder`, { method: "POST", ...json({ shot_ids: shotIds }) }),
  getShotQualityReview: (shotId: number) => request<ShotQualityReview>(`/shots/${shotId}/quality-review`),
  saveShotQualityReview: (shotId: number, payload: Partial<ShotQualityReviewInput>) =>
    request<ShotQualityReview>(`/shots/${shotId}/quality-review`, { method: "PUT", ...json(payload) }),

  listAssets: (projectId: number) => request<Asset[]>(`/projects/${projectId}/assets`),
  createAsset: (projectId: number, payload: AssetInput) =>
    request<Asset>(`/projects/${projectId}/assets`, { method: "POST", ...json(payload) }),
  uploadAsset: (projectId: number, payload: AssetUploadInput) => {
    const data = new FormData();
    data.append("asset_type", payload.asset_type);
    data.append("notes", payload.notes);
    if (payload.shot_id !== null) {
      data.append("shot_id", String(payload.shot_id));
    }
    data.append("file", payload.file);
    return request<Asset>(`/projects/${projectId}/assets/upload`, { method: "POST", ...form(data) });
  },
  updateAsset: (id: number, payload: Partial<AssetInput>) =>
    request<Asset>(`/assets/${id}`, { method: "PUT", ...json(payload) }),
  deleteAsset: (id: number) => request<void>(`/assets/${id}`, { method: "DELETE" }),
  assetFileUrl: (asset: Pick<Asset, "preview_url" | "download_url">) => {
    const path = asset.preview_url || asset.download_url;
    return path ? `${API_ORIGIN}${path}` : "";
  },

  getAudioPlan: (projectId: number) => request<AudioPlan>(`/projects/${projectId}/audio-plan`),
  saveAudioPlan: (projectId: number, payload: AudioPlan) =>
    request<AudioPlan>(`/projects/${projectId}/audio-plan`, { method: "PUT", ...json(payload) }),
  getChecklist: (projectId: number) => request<ChecklistItem[]>(`/projects/${projectId}/checklist`),
  updateChecklistItem: (id: number, checked: boolean) =>
    request<ChecklistItem>(`/checklist/${id}`, { method: "PATCH", ...json({ checked }) }),

  previewStoryPackage: (projectId: number) =>
    request<GeneratedStoryPackage>(`/projects/${projectId}/ai/story-package/preview`, { method: "POST" }),
  applyStoryPackage: (projectId: number, payload: StoryPackageApplyRequest) =>
    request<StoryPackageApplyResponse>(`/projects/${projectId}/ai/story-package/apply`, {
      method: "POST",
      ...json(payload),
    }),
  previewShotPrompts: (projectId: number, payload: ShotPromptPreviewRequest) =>
    request<GeneratedShotPromptPackage[]>(`/projects/${projectId}/ai/shot-prompts/preview`, {
      method: "POST",
      ...json(payload),
    }),
  applyShotPrompts: (projectId: number, payload: ShotPromptApplyRequest) =>
    request<ShotPromptApplyResponse>(`/projects/${projectId}/ai/shot-prompts/apply`, {
      method: "POST",
      ...json(payload),
    }),
};
