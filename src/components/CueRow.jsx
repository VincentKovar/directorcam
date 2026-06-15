import React from "react";
import { CUE_TYPE_META, payloadSummary } from "../engine/cueEngine";

// One row in the Cues screen list: type badge, label, trigger summary,
// payload summary, edit/delete, and reorder controls.
export default function CueRow({
  cue,
  project,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const meta = CUE_TYPE_META[cue.type] || { badge: "?", bg: "#374151", fg: "#FFFFFF" };
  return (
    <li
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-3 border-b border-neutral-800 px-3 py-2"
    >
      <span
        className="inline-flex w-14 shrink-0 justify-center rounded px-1.5 py-1 text-[10px] font-bold tracking-wide"
        style={{ backgroundColor: meta.bg, color: meta.fg }}
      >
        {meta.badge}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{cue.label}</div>
        <div className="truncate text-xs text-secondary">
          {cue.trigger.mode === "auto"
            ? `Auto @ char ${cue.trigger.scriptOffset}`
            : "Manual"}
          {" · "}
          {payloadSummary(cue, project)}
        </div>
      </div>
      {/* Up/down arrows — reorder fallback for touch devices (drag works on desktop). */}
      <div className="flex flex-col">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Move cue up"
          className="flex h-6 w-8 items-center justify-center text-secondary disabled:opacity-25"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Move cue down"
          className="flex h-6 w-8 items-center justify-center text-secondary disabled:opacity-25"
        >
          ▼
        </button>
      </div>
      <button
        onClick={onEdit}
        aria-label="Edit cue"
        className="flex h-11 w-11 items-center justify-center text-secondary hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete cue"
        className="flex h-11 w-11 items-center justify-center text-secondary hover:text-red-400"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </li>
  );
}
