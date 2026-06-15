import React from "react";
import { CUE_TYPE_META } from "../engine/cueEngine";

// Inline pill chip rendered in the Production view at a cue's scriptOffset.
// ⚡ = auto trigger, 👆 = manual trigger.
export default function CueChip({ cue, fired, onFire, fireEnabled }) {
  const meta = CUE_TYPE_META[cue.type] || { bg: "#374151", fg: "#FFFFFF" };
  const label =
    cue.label.length > 20 ? cue.label.slice(0, 20) + "…" : cue.label;
  return (
    <span className="mx-1 inline-flex items-center gap-1 align-middle">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${
          fired ? "opacity-40" : ""
        }`}
        style={{ backgroundColor: meta.bg, color: meta.fg }}
        title={`${cue.label} (${cue.type})`}
      >
        <span aria-hidden>{cue.trigger.mode === "auto" ? "⚡" : "👆"}</span>
        {label}
      </span>
      {cue.trigger.mode === "manual" && (
        <button
          onClick={onFire}
          disabled={!fireEnabled}
          className={`min-h-[28px] rounded-full border px-2 text-[11px] font-semibold ${
            fireEnabled
              ? "border-accent text-accent active:bg-accent active:text-black"
              : "border-neutral-700 text-neutral-600"
          }`}
          title={
            fireEnabled
              ? "Fire this cue now"
              : "Start or pause playback to enable manual cues"
          }
        >
          ▶ Fire
        </button>
      )}
    </span>
  );
}
