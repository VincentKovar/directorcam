import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { wordIndexAt } from "../engine/teleprompterEngine";
import CameraPreview from "../components/CameraPreview";

// Screen 1 — Teleprompter. Black background, scrolling script, minimal
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
    toggleRecording,
    permission,
    fontSize,
    setFontSize,
    previewVisible,
    setPreviewVisible,
  } = useApp();

  const areaRef = useRef(null); // visible text viewport
  const contentRef = useRef(null); // translated content
  const wordEls = useRef([]);
  const [showSpeed, setShowSpeed] = useState(false);

  const currentIndex = useMemo(
    () => wordIndexAt(words, scrollPosition),
    [words, scrollPosition]
  );

  // ---- Scroll positioning ---------------------------------------------------
  // The current word is pinned near a fixed "reading line" at 35% of the text
  // area height. We interpolate between the current and next word's offsetTop
  // using the fractional progress through the word, so motion is per-pixel
  // smooth even though scrollPosition is character-based.
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
    content.style.transform = `translateY(${readingLine - y}px)`;
  }, [scrollPosition, currentIndex, words, fontSize]);

  // ---- Desktop keyboard controls -------------------------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't hijack typing in form fields (e.g. settings panel open on top).
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
          jumpByWords(-10); // re-arms passed cues via context
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
  // single tap: play/pause · two-finger tap: jump back 10 words
  // swipe up/down: WPM ±5 · two-finger hold: slow mode · pinch: font size
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
    if (!g || e.touches.length > 0) return; // wait for all fingers to lift
    gesture.current = null;
    if (g.kind === "double") {
      clearTimeout(g.holdTimer);
      if (g.holding) {
        setSlow(false); // end of two-finger hold
      } else if (!g.pinched && Date.now() - g.t0 < HOLD_MS) {
        jumpByWords(-10); // two-finger tap
      }
      return;
    }
    // single touch
    if (Math.abs(g.moved) > 50) {
      // swipe up = faster, swipe down = slower
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
          style={{ maxWidth: 680, fontSize: `${fontSize}px`, lineHeight: 1.6 }}
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

        {/* Camera PiP thumbnail, top-right, toggleable */}
        <div className="absolute right-2 top-2 z-30 flex flex-col items-end gap-1">
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
        </div>
      </div>

      {/* Control strip — 48px, semi-transparent, above the tab bar */}
      <div className="relative z-40 flex h-12 shrink-0 items-center justify-between bg-black/80 px-4">
        {/* Speed indicator (tap for slider) */}
        <button
          onClick={() => setShowSpeed((s) => !s)}
          className="min-h-[44px] min-w-[64px] text-left font-mono text-sm text-secondary"
        >
          <span className="text-white">{project.wpm}</span> wpm
          {playbackState === "slow" && <span className="ml-1 text-accent">slow</span>}
        </button>

        {/* Play / pause */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-16 items-center justify-center rounded-full bg-accent text-black"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M8 5l11 7-11 7V5z" />
            </svg>
          )}
        </button>

        {/* Record */}
        <button
          onClick={toggleRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className="relative flex h-11 w-11 items-center justify-center"
        >
          {isRecording && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-600/40" />
          )}
          <span
            className={`block rounded-full border-2 ${
              isRecording
                ? "h-7 w-7 border-red-500 bg-red-600"
                : "h-7 w-7 border-red-500/70 bg-red-600/30"
            }`}
          />
        </button>
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
    </div>
  );
}
