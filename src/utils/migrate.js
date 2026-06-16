export function migrateProject(project) {
  if (project.schemaVersion) return project;
  return {
    ...project,
    schemaVersion: "1.0",
    projectId: crypto.randomUUID(),
    lastModified: new Date().toISOString(),
  };
}
