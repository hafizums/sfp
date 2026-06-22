import { Copy, Lock, Save, Unlock } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { ProductionBible, ProductionBibleInput } from "../types";

const fields: Array<{ key: keyof ProductionBibleInput; label: string; section: string }> = [
  { section: "Visual direction", key: "visual_style", label: "Visual style" },
  { section: "Visual direction", key: "color_palette", label: "Color palette" },
  { section: "Visual direction", key: "lighting_style", label: "Lighting style" },
  { section: "Visual direction", key: "camera_language", label: "Camera language" },
  { section: "Continuity rules", key: "character_consistency_rules", label: "Character consistency rules" },
  { section: "Continuity rules", key: "location_consistency_rules", label: "Location consistency rules" },
  { section: "Continuity rules", key: "prop_consistency_rules", label: "Prop consistency rules" },
  { section: "Safety / negative prompt rules", key: "safety_rules", label: "Safety rules" },
  { section: "Safety / negative prompt rules", key: "negative_prompt_rules", label: "Negative prompt rules" },
  { section: "Audio direction", key: "music_style", label: "Music style" },
  { section: "Audio direction", key: "voiceover_style", label: "Voiceover style" },
  { section: "Audio direction", key: "subtitle_style", label: "Subtitle style" },
  { section: "Final delivery specs", key: "final_delivery_specs", label: "Final delivery specs" },
];

const qualityGates = [
  "Character consistency checked",
  "Location continuity checked",
  "Visual style matches Production Bible",
  "Camera movement matches shot plan",
  "Safety rules passed",
  "No text/logos/watermarks",
  "No distorted faces/hands",
  "Shot asset attached if generated",
  "Prompt package ready",
  "Ready for review",
];

type Props = {
  projectId: number;
  bible: ProductionBible | null;
  onBibleChange: (bible: ProductionBible) => void;
  onRefreshProject: () => Promise<void>;
};

export function ProductionBiblePanel({ projectId, bible, onBibleChange, onRefreshProject }: Props) {
  const [draft, setDraft] = useState<ProductionBibleInput | null>(bible ? toInput(bible) : null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(bible ? toInput(bible) : null);
  }, [bible]);

  async function save() {
    if (!draft) {
      return;
    }
    try {
      setError(null);
      onBibleChange(await api.saveProductionBible(projectId, draft));
      await onRefreshProject();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save Production Bible.");
    }
  }

  async function setLocked(locked: boolean) {
    const next = locked ? await api.lockProductionBible(projectId) : await api.unlockProductionBible(projectId);
    onBibleChange(next);
    await onRefreshProject();
  }

  async function copyNegativeRules() {
    await navigator.clipboard.writeText(draft?.negative_prompt_rules ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!bible || !draft) {
    return <section className="workspace-band"><div className="empty-state">Loading Production Bible.</div></section>;
  }

  return (
    <section className="workspace-band" aria-label="Production Bible">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Production Bible</p>
          <h2>{bible.locked ? "Locked source of truth" : "Editable source of truth"}</h2>
        </div>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={copyNegativeRules} disabled={!draft.negative_prompt_rules.trim()}>
            <Copy size={16} /> {copied ? "Copied" : "Copy negative rules"}
          </button>
          {bible.locked ? (
            <button type="button" className="ghost" onClick={() => void setLocked(false)}><Unlock size={16} /> Unlock Bible</button>
          ) : (
            <>
              <button type="button" className="primary" onClick={() => void save()}><Save size={16} /> Save Bible</button>
              <button type="button" className="ghost" onClick={() => void setLocked(true)}><Lock size={16} /> Lock Bible</button>
            </>
          )}
        </div>
      </div>

      <p className="muted-note">Use this as the source of truth for all shots and prompts.</p>
      {error ? <div className="app-error">{error}</div> : null}

      {groupedSections().map(([section, sectionFields]) => (
        <div key={section} className="bible-section">
          <h3>{section}</h3>
          {sectionFields.map((field) => (
            <label key={field.key}>
              {field.label}
              <textarea
                value={draft[field.key]}
                disabled={bible.locked}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      ))}

      <section className="quality-template" aria-label="Project quality gate template">
        <h3>Project quality gate template</h3>
        <div className="checklist">
          {qualityGates.map((gate) => (
            <span key={gate} className="check-item">{gate}</span>
          ))}
        </div>
      </section>
    </section>
  );
}

function toInput(bible: ProductionBible): ProductionBibleInput {
  return {
    visual_style: bible.visual_style,
    color_palette: bible.color_palette,
    lighting_style: bible.lighting_style,
    camera_language: bible.camera_language,
    character_consistency_rules: bible.character_consistency_rules,
    location_consistency_rules: bible.location_consistency_rules,
    prop_consistency_rules: bible.prop_consistency_rules,
    safety_rules: bible.safety_rules,
    negative_prompt_rules: bible.negative_prompt_rules,
    music_style: bible.music_style,
    voiceover_style: bible.voiceover_style,
    subtitle_style: bible.subtitle_style,
    final_delivery_specs: bible.final_delivery_specs,
  };
}

function groupedSections() {
  const groups = new Map<string, typeof fields>();
  for (const field of fields) {
    groups.set(field.section, [...(groups.get(field.section) ?? []), field]);
  }
  return [...groups.entries()];
}
