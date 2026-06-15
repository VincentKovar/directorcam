import React, { useState } from "react";
import { useApp } from "../context/AppContext";

// First-load permission explainer (not a browser alert). Shown until the
// user either grants camera/mic access or chooses script-only mode.
export default function PermissionsPrompt() {
  const { requestPermissions, skipPermissions } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allow = async () => {
    setBusy(true);
    setError("");
    try {
      await requestPermissions();
    } catch (err) {
      setError(
        "Camera access was blocked. You can allow it in your browser's site settings, or continue in script-only mode."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="M16 10l6-3v10l-6-3" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Camera &amp; microphone</h2>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          DirectorCam needs access to your camera and microphone to record video.
          Your recordings stay on your device — nothing is uploaded.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={allow}
            disabled={busy}
            className="min-h-[48px] rounded-lg bg-accent px-6 font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Requesting…" : "Allow access"}
          </button>
          <button
            onClick={skipPermissions}
            className="min-h-[48px] rounded-lg border border-neutral-700 px-6 text-white"
          >
            Skip for now
          </button>
          <p className="text-xs text-secondary">
            Skipping enters script-only mode — the teleprompter and cues work, but
            recording is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
