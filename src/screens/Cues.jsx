import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import CueRow from "../components/CueRow";
import CueEditorForm from "../components/CueEditorForm";
import { ConfirmDialog } from "../components/TopBar";

// Screen 3 — Cue list and editor.
export default function Cues() {
  const { cueSheet, project, deleteCue, reorderCue } = useApp();
  const [editing, setEditing] = useState(null); // null | "new" | cue object
  const [deleting, setDeleting] = useState(null); // cue pending delete confirm
  const dragId = useRef(null);

  // Display order per spec: auto cues sorted by scriptOffset, then manual
  // cues in creation (array) order.
  const sorted = useMemo(() => {
    const autos = cueSheet
      .filter((c) => c.trigger.mode === "auto")
      .sort((a, b) => a.trigger.scriptOffset - b.trigger.scriptOffset);
    const manuals = cueSheet.filter((c) => c.trigger.mode === "manual");
    return [...autos, ...manuals];
  }, [cueSheet]);

  // Reordering rearranges the underlying cueSheet array. For auto cues the
  // displayed order is still offset-driven, so reordering mainly affects
  // manual cues and same-offset ties (judgement call: offsets, not list
  // position, are the source of truth for auto firing order).
  const moveBy = (cue, delta) => {
    const idx = sorted.findIndex((c) => c.id === cue.id);
    const target = sorted[idx + delta];
    if (target) reorderCue(cue.id, target.id);
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-neutral-800 p-3">
        <button
          onClick={() => setEditing("new")}
          className="min-h-[48px] w-full rounded-lg bg-accent font-semibold text-black"
        >
          + Add cue
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-secondary">
          No cues yet. Add one to coordinate your recording.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {sorted.map((cue, i) => (
            <CueRow
              key={cue.id}
              cue={cue}
              project={project}
              onEdit={() => setEditing(cue)}
              onDelete={() => setDeleting(cue)}
              onMoveUp={() => moveBy(cue, -1)}
              onMoveDown={() => moveBy(cue, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < sorted.length - 1}
              draggable
              onDragStart={() => (dragId.current = cue.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId.current && dragId.current !== cue.id) {
                  reorderCue(dragId.current, cue.id);
                }
                dragId.current = null;
              }}
            />
          ))}
        </ul>
      )}

      {editing && (
        <CueEditorForm
          cue={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message={`Delete cue "${deleting.label}"?`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteCue(deleting.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
