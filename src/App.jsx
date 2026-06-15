import React, { useEffect, useState } from "react";
import { useApp } from "./context/AppContext";
import TopBar from "./components/TopBar";
import BottomTabBar from "./components/BottomTabBar";
import Teleprompter from "./screens/Teleprompter";
import Production from "./screens/Production";
import Cues from "./screens/Cues";
import PermissionsPrompt from "./components/PermissionsPrompt";
import ProjectSettings from "./components/ProjectSettings";
import OverlayRenderer from "./components/OverlayRenderer";
import Toast from "./components/Toast";

export default function App() {
  const { permission, isRecording, pauseInfo, resumeFromPause } = useApp();
  const [activeTab, setActiveTab] = useState("teleprompter");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // PWA install prompt: capture beforeinstallprompt and offer a subtle banner.
  const [installEvent, setInstallEvent] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (permission === "unset") {
    return <PermissionsPrompt />;
  }

  return (
    <div className="flex h-full flex-col bg-surface text-white">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Persistent banner when recording continues on another tab */}
      {isRecording && activeTab !== "teleprompter" && (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-red-700 py-1.5 text-xs font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Recording in progress
        </div>
      )}

      <main className="min-h-0 flex-1">
        {activeTab === "teleprompter" && <Teleprompter />}
        {activeTab === "production" && <Production />}
        {activeTab === "cues" && <Cues />}
      </main>

      <BottomTabBar activeTab={activeTab} onSelect={setActiveTab} />

      {/* note_flash overlays render at the root, outside the camera preview
          subtree — private to the presenter, never recording-adjacent. */}
      <OverlayRenderer scope="private" />

      {/* pause_recording hold screen / countdown */}
      {pauseInfo && (
        <div className="fixed inset-0 z-[65] flex flex-col items-center justify-center bg-black/85">
          <div className="text-sm uppercase tracking-widest text-secondary">
            Recording paused
          </div>
          {pauseInfo.countdown !== null ? (
            <div className="mt-4 font-mono text-7xl font-bold text-accent">
              {pauseInfo.countdown}
            </div>
          ) : (
            <button
              onClick={resumeFromPause}
              className="mt-6 min-h-[48px] rounded-lg bg-accent px-8 font-semibold text-black"
            >
              ▶ Resume
            </button>
          )}
          {pauseInfo.countdown !== null && (
            <button
              onClick={resumeFromPause}
              className="mt-6 min-h-[44px] rounded border border-neutral-600 px-5 text-sm text-white"
            >
              Resume now
            </button>
          )}
        </div>
      )}

      {settingsOpen && <ProjectSettings onClose={() => setSettingsOpen(false)} />}

      {installEvent && (
        <div className="fixed inset-x-3 bottom-20 z-[55] flex items-center gap-3 rounded-lg border border-neutral-700 bg-surface p-3 shadow-xl">
          <p className="flex-1 text-xs text-white">
            Add DirectorCam to your home screen for the best experience
          </p>
          <button
            onClick={async () => {
              installEvent.prompt();
              await installEvent.userChoice;
              setInstallEvent(null);
            }}
            className="min-h-[44px] rounded bg-accent px-4 text-sm font-semibold text-black"
          >
            Install
          </button>
          <button
            onClick={() => setInstallEvent(null)}
            className="min-h-[44px] px-2 text-sm text-secondary"
          >
            Dismiss
          </button>
        </div>
      )}

      <Toast />
    </div>
  );
}
