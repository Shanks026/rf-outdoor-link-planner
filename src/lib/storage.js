// src/lib/storage.js
const STORAGE_KEY = "rf_planner_projects_v1";

/**
 * Save a single project object to localStorage.
 * We'll store an array of projects but for assignment we use one 'activeProject'.
 */
export function saveProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects || []));
  } catch (err) {
    console.error("Failed to save projects:", err);
  }
}

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load projects:", err);
    return [];
  }
}

/**
 * Helpers to save/load single active project by ID
 */
export function saveProject(project) {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.push(project);
  saveProjects(all);
}

export function loadProjectById(id) {
  const all = loadProjects();
  return all.find((p) => p.id === id) || null;
}
