import React, { useRef, useState } from "react";
import { useApp } from "../context/AppContext";

// Top bar: app name, settings, export, import, new project.
export default function TopBar({ onOpenSettings }) {
  const { doExport, doImport, newProject } = useApp();
  const fileRef = useRef(null);
  const [confirmNew, setConfirmNew] = useState(false);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) await doImport(file);
    e.target.value = ""; // allow re-importing the same file
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-surface px-3">
      <h1 className="text-base font-semibold tracking-wide text-white">
        Director<span className="text-accent">Cam</span>
      </h1>
      <div className="flex items-center">
        {/* Export — down arrow (saves to a file) */}
        <IconButton label="Export project" onClick={doExport}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M4 20h16" />
          </svg>
        </IconButton>
        {/* Import — up arrow (loads from a file) */}
        <IconButton label="Import project" onClick={() => fileRef.current?.click()}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3M7 8l5-5 5 5" />
            <path d="M4 20h16" />
          </svg>
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        {/* New project */}
        <IconButton label="New project" onClick={() => setConfirmNew(true)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M12 9v6M9 12h6" />
          </svg>
        </IconButton>
        {/* Settings */}
        <IconButton label="Project settings" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h.09a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55h.09a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v.09a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
          </svg>
        </IconButton>
      </div>

      {confirmNew && (
        <ConfirmDialog
          message="This will clear your current script and all cues. Are you sure?"
          onConfirm={() => {
            newProject();
            setConfirmNew(false);
          }}
          onCancel={() => setConfirmNew(false)}
        />
      )}
    </header>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center text-secondary hover:text-white"
    >
      {children}
    </button>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Yes, clear it" }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-700 bg-surface p-5">
        <p className="text-sm leading-relaxed text-white">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded border border-neutral-600 px-4 text-sm text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[44px] rounded bg-accent px-4 text-sm font-semibold text-black"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
