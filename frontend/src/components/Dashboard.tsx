import { Edit3, Film, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Project, ProjectInput } from "../types";

const defaultProject: ProjectInput = {
  title: "",
  genre: "Kids Adventure",
  target_runtime_seconds: 180,
  audience_age: "4+",
  tone: "fun, magical, safe, teamwork",
  aspect_ratio: "16:9",
  visual_style: "",
  safety_rules: [
    "No violence",
    "No horror",
    "No blood",
    "No weapons",
    "No unsafe stunts",
    "Suitable for age 4+",
  ],
};

type Props = {
  projects: Project[];
  selectedProjectId?: number;
  onCreate: (project: ProjectInput) => Promise<void>;
  onUpdate: (id: number, project: Partial<ProjectInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSelect: (project: Project) => void;
};

export function Dashboard({ projects, selectedProjectId, onCreate, onUpdate, onDelete, onSelect }: Props) {
  const [draft, setDraft] = useState<ProjectInput>(defaultProject);
  const [editingId, setEditingId] = useState<number | null>(null);

  const editingProject = projects.find((project) => project.id === editingId);

  function startEditing(project: Project) {
    setEditingId(project.id);
    setDraft({
      title: project.title,
      genre: project.genre,
      target_runtime_seconds: project.target_runtime_seconds,
      audience_age: project.audience_age,
      tone: project.tone,
      aspect_ratio: project.aspect_ratio,
      visual_style: project.visual_style,
      safety_rules: project.safety_rules,
    });
  }

  async function submit() {
    if (!draft.title.trim()) {
      return;
    }
    if (editingProject) {
      await onUpdate(editingProject.id, draft);
    } else {
      await onCreate(draft);
    }
    setEditingId(null);
    setDraft(defaultProject);
  }

  return (
    <section className="dashboard" aria-label="Project Dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Private planner</p>
          <h1>Short Film Planner Studio</h1>
        </div>
        <span className="runtime-pill">3:00 target | 16:9 | age 4+</span>
      </div>

      <form className="project-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label>
          Title
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="The Moon Map"
          />
        </label>
        <label>
          Visual style
          <input
            value={draft.visual_style}
            onChange={(event) => setDraft({ ...draft, visual_style: event.target.value })}
            placeholder="soft storybook 3D, bright safe adventure"
          />
        </label>
        <button type="submit" className="primary">
          {editingProject ? <Edit3 size={16} /> : <Plus size={16} />}
          {editingProject ? "Save project" : "Create project"}
        </button>
      </form>

      <div className="project-grid">
        {projects.map((project) => (
          <article
            className={project.id === selectedProjectId ? "project-card selected" : "project-card"}
            key={project.id}
          >
            <button className="project-select" onClick={() => onSelect(project)}>
              <span className="icon-badge"><Film size={18} /></span>
              <span>
                <strong>{project.title}</strong>
                <small>{project.genre} | {project.aspect_ratio}</small>
              </span>
            </button>
            <div className="metrics">
              <span>{project.current_planned_runtime}s / {project.target_runtime_seconds}s</span>
              <span>{project.shot_count} shots</span>
              <span>{project.progress}% progress</span>
              <span>{project.production_bible_locked ? "Bible locked" : "Bible editable"}</span>
              <span>{project.shots_approved_for_final}/{project.shot_count} final-ready</span>
            </div>
            <div className="meter" aria-label={`${project.progress}% progress`}>
              <span style={{ width: `${project.progress}%` }} />
            </div>
            <div className="row-actions">
              <button type="button" className="ghost icon-text" onClick={() => startEditing(project)} title="Edit project">
                <Edit3 size={16} /> Edit
              </button>
              <button
                type="button"
                className="danger icon-text"
                title="Delete project"
                onClick={() => {
                  if (window.confirm(`Delete "${project.title}"?`)) {
                    void onDelete(project.id);
                  }
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
