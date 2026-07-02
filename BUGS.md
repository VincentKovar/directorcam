# BUGS.md — Open Bugs and Watch Items

Snapshot of the Google Doc bug tracker as of this write-up. The Google Doc
stays the source of truth for now — update this file to match it when it
changes, so Claude Code sessions in the repo see current status without
needing the doc pasted in each time.

## Open bugs

### Bug A — Zoom slider range (low priority, open)
Zoom slider appears to start above `min` on some takes, limiting the
downward zoom range.

### Bug B — Production tab shows one cue only (medium priority, open, pre-existing)
Production tab always displays the same single cue regardless of the full
cue sheet. Likely a key or index collision in the list rendering.

### Bug C — visibilitychange resets isRecording incorrectly (medium priority, open)
The `visibilitychange` listener still resets `isRecording` to false when
returning from an external URL during a take. The
`recordedChunksRef.current.length > 0` guard is insufficient because the
browser may flush chunks during external navigation (the recorder runs with a
1000 ms timeslice, so chunks exist after the first second of any take — the
guard is effectively always true).

**Fix approach (revised 2026-07-01, replaces the earlier `takeStartedRef`
flag idea):** a bare `takeStartedRef` boolean is not enough, for three
reasons found in the Phase 3a.0 audit:

1. **It inverts the failure instead of fixing it.** If the visibility handler
   only resets `isRecording` when the flag is false, it will *never* reset
   during a take — including when mobile Safari/Chrome genuinely kills the
   recorder in the background. That leaves a dead recorder behind a live REC
   indicator, which for field recording is worse than the false reset. The
   handler must *reconcile*, not guard: on return-to-visible with a take
   active and the recorder inactive, mark the take interrupted, tell the
   user, and offer to save what was captured or restart.
2. **It doesn't touch the path that actually loses the data.** When the
   browser kills the recorder while backgrounded, `onstop` fires immediately
   and the `saveOnStop === false` branch in `AppContext.jsx` discards the
   chunks — long before the user returns and `visibilitychange` runs. The
   `onstop` discard must become take-aware: if a take is active, keep the
   chunks and flag the take interrupted instead of clearing them. (This is
   the same discard path behind Bug E.)
3. **It adds a third ad-hoc boolean to already-scattered take state.**
   "Is a take happening" currently lives in `isRecording` (context),
   `countdownPhase` (Teleprompter local state, destroyed on tab switch),
   `playbackState`, and `pauseInfo`. Phase 3a.2 adds a pre-flight stage and
   3a.4 adds a manual pause that must be distinguishable from the cue-driven
   pause — all asking for the same thing.

**Do instead:** one explicit take state machine in `AppContext`, roughly
`idle → preflight → countdown → recording → paused(manual|cue) →
interrupted → idle`. The Bug C condition becomes derivable
(`takeState !== 'idle'`), the visibility handler and `onstop` consult it to
reconcile rather than silently flip flags, and 3a.2/3a.4 get their states
for free. The machine should enter its take-active state at successful
`recorder.start()`, not at the Start Take tap, so pre-flight permission
prompts and file pickers can't fire visibility events while "take started"
is already true.

**Relevant to Phase 3a.2** (permissions pre-flight) and **3a.5** (B-roll file
picking) — both add more ways the page loses focus mid-take. This work is
scheduled as its own step (3a.0c in `plan.md`) between the smoke-test
harness and pre-flight, so it lands before that work, not after.

### Bug D — Cue reordering has no touch equivalent (low priority, open, pre-existing)
Cue reordering in the Cues tab works via drag on desktop but has no touch
equivalent on mobile.

### Bug E — Camera-switch cue mid-take kills the recorder and silently discards the take (high priority, open, confirmed 2026-07-01)
A `camera_switch` cue firing during a take destroys the recording, and the
app then falsely reports success:

1. `switchCamera` → `startCamera` stops all tracks on the current stream
   before acquiring the new one (`AppContext.jsx`, `startCamera`).
2. The `MediaRecorder` was created against that old stream, so when its
   source tracks end, the recorder stops.
3. `onstop` runs with `saveOnStop === false` and **clears
   `recordedChunksRef`** — the footage recorded so far is discarded.
4. `isRecording` stays `true`, so the UI keeps showing REC over a dead
   recorder.
5. When the user later taps "Save and Reset", `stopRecording(false)` finds
   the recorder already inactive, `onstop` never fires again, **no file is
   downloaded**, and the **"Recording saved" toast shows anyway**.

**Confirmed by instrumented browser test (2026-07-01):** dev build in
desktop Chromium with a synthetic camera stream (canvas capture) standing in
for `getUserMedia`, using the demo project's own cue sheet. Control take
with no camera switch: "Save and Reset" produced a 67,991-byte `video/webm`
blob. Camera-switch take: the recorder's `stop` event fired at t=16.7 s —
the exact moment cue_002 (switch to rear) fired — REC was still displayed at
t=20 s, "Save and Reset" produced **zero** download blobs, and the
"Recording saved" toast appeared. The mechanism is spec-level MediaRecorder
behaviour (all source tracks ended → recorder stops), not device-specific,
but per project rules a real-device pass should re-confirm before the fix is
considered verified.

**Impact:** every take containing an auto or manual camera-switch cue loses
all footage — the demo project itself contains two such cues. This also
contradicts `PRD.md`'s non-goals section, which says "switching mid-take
changes the live preview but the recording stays on the camera active at
record-start"; the code cannot do that today because the record-start
camera's tracks are stopped on switch.

**Fix direction (decide in 3a.0c, do not patch piecemeal):** the `onstop`
discard must become take-aware (see Bug C, revised fix approach) so an
unexpected recorder stop during a take preserves the chunks and surfaces an
"interrupted" state instead of silently discarding. Separately, decide what
a camera switch mid-take should actually do to the recording — e.g. keep
the old track alive for the recorder while the preview switches (matching
the PRD's stated behaviour), or stop-and-segment the recording — a product
decision for Vincent, not something to invent in a fix session.

## Watch items — new in Phase 3a (not bugs yet, risk flags for testing)

- **Reading-line scroll math vs. shrunk teleprompter area.** The scroll
  effect computes the reading line as `area.clientHeight * 0.35`, which is
  proportional and should adapt automatically to the new, shorter script
  area. Confirmed correct in code, not yet confirmed to *feel* right at
  4–5 visible lines on a real device. Test before closing 3a.3.
- **Two pause mechanisms coexisting.** The new manual Pause button and the
  existing pre-programmed "Pause recording" cue type both stop playback.
  Confirm they don't fight each other if a pre-programmed pause cue fires
  while the manual pause is already active (or vice versa). Test before
  closing 3a.4.
- **Mute state vs. cue audio.** Confirm sound-effect and video-cue audio
  genuinely stay audible while the mic is muted, on both the live preview
  and (as applicable) the recorded file. Test before closing 3a.4.
- **IndexedDB-cached video files surviving a real recording session.**
  Confirm a cached local video file cue still resolves correctly after the
  page has been backgrounded (mobile OS may evict tabs). Test before
  closing 3a.5.

## Process

- Check this file before starting work in the repo.
- Check off fixed bugs and add newly discovered ones as part of every
  session's end-of-session checklist (see `plan.md`).
- If this file and the Google Doc drift, treat the Google Doc as correct
  and reconcile here.
