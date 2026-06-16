import React, { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { clampWpm } from "../utils/importExport";
import { getErrorLog, clearErrorLog } from "../utils/errorLog";
import appPackage from "../../package.json";

const APP_VERSION = appPackage.version;

// Slide-up project settings panel: title, WPM, slide deck URL, plus script editor.
export default function ProjectSettings({ onClose }) {
  const { project, updateProject, toast } = useApp();
  const [title, setTitle] = useState(project.title);
  const [wpm, setWpmLocal] = useState(project.wpm);
  const [slideDeckUrl, setSlideDeckUrl] = useState(project.slideDeckUrl);
  const [script, setScript] = useState(project.script);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // 5-tap easter egg on the version number to open the dev panel.
  const tapTimesRef = useRef([]);
  const TAP_WINDOW_MS = 3000;
  const TAP_REQUIRED = 5;

  const handleVersionTap = () => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current, now].filter(
      (t) => now - t < TAP_WINDOW_MS
    );
    if (tapTimesRef.current.length >= TAP_REQUIRED) {
      tapTimesRef.current = [];
      setShowDevPanel(true);
    }
  };

  const save = () => {
    updateProject({
      title: title.trim() || "Untitled project",
      wpm: clampWpm(wpm),
      slideDeckUrl: slideDeckUrl.trim(),
      script,
      lastModified: new Date().toISOString(),
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

          <Field label={"Scroll speed -- " + clampWpm(wpm) + " WPM (80-220)"}>
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
              placeholder="https://docs.google.com/presentation/d/present"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-secondary">
              Used by static_screen cues: #slide=id.p&lt;N&gt; is appended.
            </p>
          </Field>

          <Field label={"Script (" + script.length + " characters)"}>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={12}
              placeholder="Write or paste your full script here..."
              className={inputCls + " font-mono text-[13px] leading-relaxed"}
            />
            <p className="mt-1 text-xs text-secondary">
              Auto cues anchor to character positions in this text. Editing the
              script may shift where existing cues fire.
            </p>
          </Field>

          {/* Version number -- tap 5 times rapidly to open the dev panel */}
          <button
            onClick={handleVersionTap}
            className="mt-2 w-full py-2 text-center text-xs text-neutral-700 select-none"
            aria-label="App version"
          >
            v{APP_VERSION}
          </button>
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

      {showDevPanel && (
        <DevPanel onClose={() => setShowDevPanel(false)} />
      )}
    </div>
  );
}

function DevPanel({ onClose }) {
  const [log, setLog] = useState(() => getErrorLog());

  const handleCopy = () => {
    navigator.clipboard
      .writeText(JSON.stringify(log, null, 2))
      .catch(() => {});
  };

  const handleClear = () => {
    clearErrorLog();
    setLog([]);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-700 px-4 py-3">
        <span className="font-mono text-sm font-bold text-green-400">
          Dev Panel -- Error Log ({log.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="min-h-[36px] rounded border border-neutral-600 px-3 font-mono text-xs text-neutral-300"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={handleClear}
            className="min-h-[36px] rounded border border-red-800 px-3 font-mono text-xs text-red-400"
          >
            Clear Log
          </button>
          <button
            onClick={onClose}
            className="min-h-[36px] rounded border border-neutral-600 px-3 font-mono text-xs text-neutral-400"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {log.length === 0 ? (
          <p className="font-mono text-xs text-neutral-500">No errors logged.</p>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className="mb-3 rounded border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs"
            >
              <div className="mb-1 text-neutral-500">{entry.ts}</div>
              <div className="text-red-400">[{entry.type}] {entry.message}</div>
              {entry.source && (
                <div className="mt-0.5 text-neutral-600">
                  {entry.source}:{entry.line}:{entry.col}
                </div>
              )}
              {entry.stack && (
                <pre className="mt-1 whitespace-pre-wrap break-all text-neutral-600">
                  {entry.stack}
                </pre>
              )}
            </div>
          ))
        )}
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
