import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { clampWpm } from "../utils/importExport";

// Slide-up project settings panel: title, WPM, slide deck URL — plus the
// script editor. The spec defines no dedicated screen for writing the script,
// so it lives here with the other project-level fields (judgement call).
export default function ProjectSettings({ onClose }) {
  const { project, updateProject, toast } = useApp();
  const [title, setTitle] = useState(project.title);
  const [wpm, setWpmLocal] = useState(project.wpm);
  const [slideDeckUrl, setSlideDeckUrl] = useState(project.slideDeckUrl);
  const [script, setScript] = useState(project.script);

  const save = () => {
    updateProject({
      title: title.trim() || "Untitled project",
      wpm: clampWpm(wpm),
      slideDeckUrl: slideDeckUrl.trim(),
      script,
    });
    toast("Settings saved", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-black/60">
      <div onClick={onClose} className="h-10 shrink-0" />
      <div className="flex flex-1 flex-col overflow-hidden rounded-t-2xl border-t border-neutral-700 bg-surface">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Project settings</h2>
          <button onClick={onClose} className="min-h-[44px] px-3 text-sm text-secondary">
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Field label="Project title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={`Scroll speed — ${clampWpm(wpm)} WPM (80–220)`}>
            <input
              type="range"
              min="80"
              max="220"
              step="5"
              value={clampWpm(wpm)}
              onChange={(e) => setWpmLocal(Number(e.target.value))}
              className="h-11 w-full accent-amber-500"
            />
          </Field>

          <Field label="Slide deck URL (Google Slides present mode)">
            <input
              type="url"
              value={slideDeckUrl}
              onChange={(e) => setSlideDeckUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/…/present"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-secondary">
              Used by static_screen cues: #slide=id.p&lt;N&gt; is appended.
            </p>
          </Field>

          <Field label={`Script (${script.length} characters)`}>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={12}
              placeholder="Write or paste your full script here…"
              className={`${inputCls} font-mono text-[13px] leading-relaxed`}
            />
            <p className="mt-1 text-xs text-secondary">
              Auto cues anchor to character positions in this text. Editing the
              script may shift where existing cues fire.
            </p>
          </Field>
        </div>

        <div className="border-t border-neutral-800 p-4">
          <button
            onClick={save}
            className="min-h-[48px] w-full rounded-lg bg-accent font-semibold text-black"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-accent focus:outline-none";

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}
