// Project JSON export / import logic.

export function exportProject(project, cueSheet) {
  const data = JSON.stringify({ project, cueSheet }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(project.title || "untitled").replace(/\s+/g, "_")}_directorcam.json`;
  a.click();
  // Revoke after the click has been processed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reads a File, parses JSON, validates the minimum shape required by the app.
// Resolves with { project, cueSheet } or rejects with an Error whose message
// is suitable for a toast.
export function importProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object") throw new Error("Not a JSON object");
        if (!data.project || typeof data.project !== "object") {
          throw new Error("Missing \"project\" key");
        }
        if (!Array.isArray(data.cueSheet)) {
          throw new Error("Missing \"cueSheet\" key");
        }
        // Fill in any absent optional fields with safe defaults so a
        // hand-edited file doesn't crash the UI.
        const project = {
          id: data.project.id || "proj_imported",
          title: data.project.title || "Imported project",
          script: data.project.script || "",
          wpm: clampWpm(data.project.wpm),
          createdAt: data.project.createdAt || new Date().toISOString(),
          updatedAt: data.project.updatedAt || new Date().toISOString(),
          slideDeckUrl: data.project.slideDeckUrl || "",
        };
        const cueSheet = data.cueSheet.map((c, i) => ({
          id: c.id || `cue_${String(i + 1).padStart(3, "0")}`,
          label: c.label || "Untitled cue",
          type: c.type || "note_flash",
          trigger: {
            mode: c.trigger?.mode === "manual" ? "manual" : "auto",
            scriptOffset: Number(c.trigger?.scriptOffset) || 0,
          },
          payload: c.payload && typeof c.payload === "object" ? c.payload : {},
          notes: c.notes || "",
        }));
        resolve({ project, cueSheet });
      } catch (err) {
        reject(new Error(`Invalid project file: ${err.message}`));
      }
    };
    reader.readAsText(file);
  });
}

export function clampWpm(wpm) {
  const n = Number(wpm);
  if (!Number.isFinite(n)) return 130;
  return Math.min(220, Math.max(80, Math.round(n)));
}
