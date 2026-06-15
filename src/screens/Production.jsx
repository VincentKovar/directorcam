import React, { useEffect, useMemo, useRef } from "react";
import { useApp } from "../context/AppContext";
import { wordIndexAt } from "../engine/teleprompterEngine";
import CueChip from "../components/CueChip";

// Screen 2 — Production view: the director's script with inline cue chips,
// tracking the live scrollPosition.
export default function Production() {
  const {
    words,
    cueSheet,
    project,
    scrollPosition,
    playbackState,
    seekTo,
    firedCueIds,
    fireManualCue,
  } = useApp();

  const currentIndex = useMemo(
    () => wordIndexAt(words, scrollPosition),
    [words, scrollPosition]
  );

  // Map word index -> auto cues anchored inside that word. Chips render
  // immediately before the word containing their scriptOffset.
  const chipsByWord = useMemo(() => {
    const map = new Map();
    for (const cue of cueSheet) {
      if (cue.trigger.mode !== "auto") continue;
      const idx = Math.max(0, wordIndexAt(words, cue.trigger.scriptOffset));
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx).push(cue);
    }
    return map;
  }, [cueSheet, words]);

  const manualCues = useMemo(
    () => cueSheet.filter((c) => c.trigger.mode === "manual"),
    [cueSheet]
  );

  // Manual fire buttons are active only while playing or paused.
  const fireEnabled = ["playing", "paused", "slow"].includes(playbackState);

  // Auto-scroll to keep the current position visible. Only follows during
  // playback so manual browsing of the script isn't hijacked.
  const currentRef = useRef(null);
  const lastScrolledIndex = useRef(-1);
  useEffect(() => {
    if (playbackState !== "playing" && playbackState !== "slow") return;
    if (currentIndex === lastScrolledIndex.current) return;
    lastScrolledIndex.current = currentIndex;
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex, playbackState]);

  return (
    <div className="h-full overflow-y-auto bg-surface">
      {/* Manual cues have no script position, so they live in a strip at the
          top of the production view with their Fire buttons (judgement call —
          the spec anchors chips at scriptOffset, which manual cues lack). */}
      {manualCues.length > 0 && (
        <div className="border-b border-neutral-800 px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">
            Manual cues
          </div>
          <div className="flex flex-wrap gap-y-2">
            {manualCues.map((cue) => (
              <CueChip
                key={cue.id}
                cue={cue}
                fired={firedCueIds.has(cue.id)}
                fireEnabled={fireEnabled}
                onFire={() => fireManualCue(cue)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6">
        {words.length === 0 ? (
          <p className="text-center text-sm text-secondary">
            No script yet. Open settings (gear icon) to write one.
          </p>
        ) : (
          <p className="text-lg leading-loose text-white" style={{ fontSize: 18 }}>
            {words.map((w, i) => (
              <React.Fragment key={w.start}>
                {chipsByWord.get(i)?.map((cue) => (
                  <CueChip
                    key={cue.id}
                    cue={cue}
                    fired={firedCueIds.has(cue.id)}
                    fireEnabled={fireEnabled}
                    onFire={() => fireManualCue(cue)}
                  />
                ))}
                <span
                  ref={i === currentIndex ? currentRef : undefined}
                  onClick={() => seekTo(w.start)}
                  className={`cursor-pointer rounded px-0.5 ${
                    i === currentIndex
                      ? "border-b-2 border-accent bg-accent/20 text-accent"
                      : i < currentIndex
                        ? "text-secondary"
                        : "text-white hover:bg-neutral-800"
                  }`}
                >
                  {w.text}
                </span>{" "}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      {/* Status line */}
      <div className="sticky bottom-0 border-t border-neutral-800 bg-surface/95 px-4 py-2 font-mono text-xs text-secondary">
        char {Math.floor(scrollPosition)} · word {currentIndex + 1}/{words.length} ·{" "}
        <span className={playbackState === "stopped" ? "" : "text-accent"}>
          {playbackState}
        </span>
      </div>
    </div>
  );
}
