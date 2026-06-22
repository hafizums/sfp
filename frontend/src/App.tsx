import { useEffect, useState } from "react";

import { api } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { ProjectWorkspace } from "./components/ProjectWorkspace";
import type { Project, ProjectInput } from "./types";
import "./styles.css";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function loadProjects(selectId = selectedId) {
    try {
      const nextProjects = await api.listProjects();
      setProjects(nextProjects);
      if (selectId && nextProjects.some((project) => project.id === selectId)) {
        setSelectedId(selectId);
      } else {
        setSelectedId(nextProjects[0]?.id);
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reach backend");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const selectedProject = projects.find((project) => project.id === selectedId);

  async function createProject(payload: ProjectInput) {
    const project = await api.createProject(payload);
    await loadProjects(project.id);
  }

  async function updateProject(id: number, payload: Partial<ProjectInput>) {
    await api.updateProject(id, payload);
    await loadProjects(id);
  }

  async function deleteProject(id: number) {
    await api.deleteProject(id);
    await loadProjects();
  }

  return (
    <main>
      {error ? <div className="app-error">{error}</div> : null}
      <Dashboard
        projects={projects}
        selectedProjectId={selectedId}
        onCreate={createProject}
        onUpdate={updateProject}
        onDelete={deleteProject}
        onSelect={(project) => setSelectedId(project.id)}
      />
      {selectedProject ? (
        <ProjectWorkspace project={selectedProject} onRefreshProject={() => loadProjects(selectedProject.id)} />
      ) : (
        <section className="empty-state">Create a project to begin planning.</section>
      )}
    </main>
  );
}
