import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp, IS_MOBILE } from "../context/AppContext";
import { wordIndexAt } from "../engine/teleprompterEngine";
import { logError } from "../utils/errorLog";
import CameraPreview from "../components/CameraPreview";

// Screen 1 -- Teleprompter. Black background, scrolling script, minimal
// 48px control strip at the bottom (sits above the tab bar).
export default function Teleprompter() {
  const {
    project,
    words,
    scrollPosition,
    playbackState,
    togglePlay,
    jumpByWords,
    setSlow,
    setWpm,
    isRecording,
    startRecording,
    stopRecording,
    stop,
    setSharedAudioContext,
    permission,
    fontSize,
    setFontSize,
    previewVisible,
    setPreviewVisible,
    activeStream,
    cameraSelection,
    switchCamera,
    videoDevices,
  } = useApp();

  const areaRef = useRef(null);
  const contentRef = useRef(null);
  const wordEls = useRef([]);
  const [showSpeed, setShowSpeed] = useState(false);

  // ---- Take state -----------------------------------------------------------
  const [countdownPhase, setCountdownPhase] = useState(null); // null | 3 | 2 | 1
  const [showResetDialog, setShowResetDialog] = useState(false);
  const audioCtxRef = useRef(null);

  // ---- Zoom state (mobile only, during recording) ---------------------------
  const [zoomCaps, setZoomCaps] = useState(null); // null or { min, max, step }
  const [zoomValue, setZoomValue] = useState(1);

  // Read zoom capability from the active video track whenever recording starts
  // or the stream changes. Resets to the widest view (min) on every new take.
  useEffect(() => {
    if (!IS_MOBILE || !isRecording || !activeStream) {
      setZoomCaps(null);
      return;
    }
    const track = activeStream.getVideoTracks()[0];
    if (!track) {
      setZoomCaps(null);
      return;
    }
    const caps = track.getCapabilities?.();
    if (!caps?.zoom) {
      setZoomCaps(null);
      return;
    }
    const { min, max, step } = caps.zoom;
    setZoomCaps({ min, max, step });
    setZoomValue(min);
  }, [isRecording, activeStream]);

  const handleZoomChange = async (e) => {
    const newZoom = Number(e.target.value);
    setZoomValue(newZoom);
    const track = activeStream?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: newZoom }] });
    } catch (err) {
      logError("Camera zoom applyConstraints failed", err);
    }
  };

  // ---- Camera flip (mobile only) -------------------------------------------
  const handleCameraFlip = () => {
    const currentFacing =
      cameraSelection.type === "facingMode" ? cameraSelection.value : "user";
    switchCamera({ type: "facingMode", value: currentFacing === "user" ? "environment" : "user" });
  };

  // ---- Desktop camera picker value -----------------------------------------
  // After the first stream starts, cameraSelection resolves to { type: 'deviceId' }.
  // Before that, fall back to the first enumerated device so the dropdown is not blank.
  const desktopPickerValue =
    cameraSelection.type === "deviceId"
      ? cameraSelection.value
      : (videoDevices[0]?.deviceId ?? "");

  // ---- Countdown logic ------------------------------------------------------
  const handleStartTake = () => {
    // Create the single AudioContext on this user gesture tap -- it stays
    // unlocked for the rest of the session, covering both countdown beeps
    // and cue engine sound effects.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ac = new AudioContextClass();
    audioCtxRef.current = ac;
    setSharedAudioContext(ac);
    setCountdownPhase(3);
  };

  const handleCancelCountdown = () => {
    setCountdownPhase(null);
  };

  useEffect(() => {
    if (countdownPhase === null) return;

    // Play a short beep for each count. Higher pitch on "1" to signal launch.
    const ac = audioCtxRef.current;
    if (ac) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = countdownPhase === 1 ? 1046 : 880;
      osc.connect(gain);
      gain.connect(ac.destination);
      gain.gain.setValueAtTime(0.35, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.15);
    }

    const timer = setTimeout(() => {
      if (countdownPhase === 1) {
        setCountdownPhase(null);
        startRecording().catch(() => {});
        togglePlay(); // stopped -> playing
      } else {
        setCountdownPhase(countdownPhase - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdownPhase, startRecording, togglePlay]);

  // ---- Reset take actions ---------------------------------------------------
  const executeReset = (discard) => {
    stopRecording(discard);
    stop(); // position -> 0, re-arms all cues, preserves camera
    setShowResetDialog(false);
  };

  const currentIndex = useMemo(
    () => wordIndexAt(words, scrollPosition),
    [words, scrollPosition]
  );

  // ---- Scroll positioning ---------------------------------------------------
  useLayoutEffect(() => {
    const area = areaRef.current;
    const content = contentRef.current;
    if (!area || !content || words.length === 0) return;
    const cur = wordEls.current[currentIndex];
    if (!cur) return;
    const next = wordEls.current[currentIndex + 1];
    const wordStart = words[currentIndex].start;
    const nextStart = words[currentIndex + 1]?.start ?? wordStart + 1;
    const progress = Math.min(
      1,
      Math.max(0, (scrollPosition - wordStart) / (nextStart - wordStart))
    );
    const y = cur.offsetTop + (next ? (next.offsetTop - cur.offsetTop) * progress : 0);
    const readingLine = area.clientHeight * 0.35;
    content.style.transform = "translateY(" + (readingLine - y) + "px)";
  }, [scrollPosition, currentIndex, words, fontSize]);

  // ---- Desktop keyboard controls -------------------------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowUp":
          e.preventDefault();
          setWpm(project.wpm + 5);
          break;
        case "ArrowDown":
          e.preventDefault();
          setWpm(project.wpm - 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          jumpByWords(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          jumpByWords(10);
          break;
        case "Shift":
          if (!e.repeat) setSlow(true);
          break;
        default:
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") setSlow(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePlay, setWpm, jumpByWords, setSlow, project.wpm]);

  // ---- Mobile touch controls -------------------------------------------------
  const gesture = useRef(null);
  const HOLD_MS = 350;

  const distance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      gesture.current = {
        kind: "single",
        startY: e.touches[0].clientY,
        moved: 0,
        t0: Date.now(),
      };
    } else if (e.touches.length === 2) {
      const g = {
        kind: "double",
        startDist: distance(e.touches),
        startFont: fontSize,
        pinched: false,
        holding: false,
        t0: Date.now(),
      };
      g.holdTimer = setTimeout(() => {
        g.holding = true;
        setSlow(true);
      }, HOLD_MS);
      gesture.current = g;
    }
  };

  const onTouchMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "single" && e.touches.length === 1) {
      g.moved = e.touches[0].clientY - g.startY;
    } else if (g.kind === "double" && e.touches.length === 2) {
      const d = distance(e.touches);
      if (Math.abs(d - g.startDist) > 24) {
        g.pinched = true;
        clearTimeout(g.holdTimer);
        setFontSize(g.startFont * (d / g.startDist));
      }
    }
  };

  const onTouchEnd = (e) => {
    const g = gesture.current;
    if (!g || e.touches.length > 0) return;
    gesture.current = null;
    if (g.kind === "double") {
      clearTimeout(g.holdTimer);
      if (g.holding) {
        setSlow(false);
      } else if (!g.pinched && Date.now() - g.t0 < HOLD_MS) {
        jumpByWords(-10);
      }
      return;
    }
    if (Math.abs(g.moved) > 50) {
      setWpm(project.wpm + (g.moved < 0 ? 5 : -5));
    } else if (Date.now() - g.t0 < 400) {
      togglePlay();
    }
  };

  const playing = playbackState === "playing" || playbackState === "slow";

  return (
    <div className="relative flex h-full flex-col bg-black">
      {/* Text area */}
      <div
        ref={areaRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* Reading line marker at 35% */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t border-accent/25"
          style={{ top: "35%" }}
        />
        <div
          ref={contentRef}
          className="mx-auto select-none px-6 text-white will-change-transform"
          style={{ maxWidth: 680, fontSize: fontSize + "px", lineHeight: 1.6 }}
        >
          {words.length === 0 ? (
            <p className="pt-24 text-center text-base text-secondary">
              No script yet. Open settings (gear icon) to write one.
            </p>
          ) : (
            words.map((w, i) => (
              <span
                key={w.start}
                ref={(el) => (wordEls.current[i] = el)}
                className={
                  i === currentIndex
                    ? "rounded bg-accent/20 text-accent"
                    : i < currentIndex
                      ? "text-neutral-500"
                      : "text-white"
                }
              >
                {w.text}{" "}
              </span>
            ))
          )}
        </div>

        {/* Camera PiP thumbnail + camera controls, top-right */}
        <div className="absolute right-2 top-2 z-30 flex flex-col items-end gap-1">
          {/* Preview visibility toggle */}
          <button
            onClick={() => setPreviewVisible(!previewVisible)}
            aria-label="Toggle camera preview"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white/70"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="14" height="12" rx="2" />
              <path d="M16 10l6-3v10l-6-3" />
              {!previewVisible && <path d="M3 3l18 18" />}
            </svg>
          </button>
          {previewVisible && permission === "granted" && (
            <CameraPreview className="h-[90px] w-[160px] rounded-lg border border-neutral-700" />
          )}

          {/* Mobile: front/back toggle button */}
          {IS_MOBILE && permission === "granted" && (
            <button
              onClick={handleCameraFlip}
              aria-label="Flip camera"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/70"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
          )}

          {/* Desktop: camera dropdown (multiple devices) or static label (one device) */}
          {!IS_MOBILE && permission === "granted" && videoDevices.length > 1 && (
            <select
              value={desktopPickerValue}
              onChange={(e) => switchCamera({ type: "deviceId", value: e.target.value })}
              aria-label="Camera"
              className="max-w-[160px] rounded border border-neutral-700 bg-black/70 px-2 py-1 text-xs text-white"
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          {!IS_MOBILE && permission === "granted" && videoDevices.length === 1 && (
            <span className="max-w-[160px] truncate rounded bg-black/50 px-2 py-1 text-xs text-white/60">
              {videoDevices[0].label || "Camera 1"}
            </span>
          )}
        </div>
      </div>

      {/* Zoom slider row — mobile only, visible during recording when device supports zoom */}
      {IS_MOBILE && isRecording && zoomCaps && (
        <div className="flex shrink-0 items-center gap-3 bg-black/80 px-4 py-1.5">
          <span className="text-[11px] text-white/50">Zoom</span>
          <input
            type="range"
            min={zoomCaps.min}
            max={zoomCaps.max}
            step={zoomCaps.step ?? "any"}
            value={zoomValue}
            onChange={handleZoomChange}
            aria-label="Camera zoom"
            className="flex-1 accent-amber-500"
          />
        </div>
      )}

      {/* Control strip -- 48px, semi-transparent, above the tab bar */}
      <div className="relative z-40 flex h-12 shrink-0 items-center justify-between bg-black/80 px-4">
        {/* Speed indicator / recording status */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSpeed((s) => !s)}
            className="min-h-[44px] min-w-[64px] text-left font-mono text-sm text-secondary"
          >
            <span className="text-white">{project.wpm}</span> wpm
            {playbackState === "slow" && <span className="ml-1 text-accent">slow</span>}
          </button>
          {isRecording && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              REC
            </span>
          )}
        </div>

        {/* Primary action button */}
        {isRecording ? (
          <button
            onClick={() => setShowResetDialog(true)}
            className="min-h-[44px] rounded-lg border border-neutral-600 px-5 text-sm font-semibold text-white"
          >
            Reset Take
          </button>
        ) : (
          <button
            onClick={handleStartTake}
            disabled={countdownPhase !== null}
            className="min-h-[44px] rounded-lg bg-accent px-6 text-sm font-bold text-black disabled:opacity-50"
          >
            Start Take
          </button>
        )}
      </div>

      {/* Speed slider popover */}
      {showSpeed && (
        <div className="absolute bottom-14 left-3 z-50 w-64 rounded-lg border border-neutral-700 bg-surface p-4">
          <div className="mb-2 flex justify-between font-mono text-xs text-secondary">
            <span>80</span>
            <span className="text-white">{project.wpm} wpm</span>
            <span>220</span>
          </div>
          <input
            type="range"
            min="80"
            max="220"
            step="5"
            value={project.wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="h-11 w-full accent-amber-500"
          />
        </div>
      )}

      {/* Countdown overlay */}
      {countdownPhase !== null && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
          <div className="font-mono text-9xl font-bold text-accent" aria-live="assertive">
            {countdownPhase}
          </div>
          <button
            onClick={handleCancelCountdown}
            className="mt-10 min-h-[48px] rounded-lg border border-neutral-500 px-8 text-base font-semibold text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Reset Take confirmation dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-6">
          <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-surface p-5">
            <h2 className="mb-1 text-base font-semibold text-white">Reset Take</h2>
            <p className="mb-5 text-sm text-secondary">
              What would you like to do with the current recording?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => executeReset(false)}
                className="min-h-[48px] rounded-lg bg-accent font-semibold text-black"
              >
                Save and Reset
              </button>
              <button
                onClick={() => executeReset(true)}
                className="min-h-[48px] rounded-lg border border-red-700 font-semibold text-red-400"
              >
                Reset Without Saving
              </button>
              <button
                onClick={() => setShowResetDialog(false)}
                className="min-h-[44px] rounded-lg border border-neutral-600 text-sm text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
