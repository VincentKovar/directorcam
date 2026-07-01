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
browser may flush chunks during external navigation.

**Fix approach:** introduce a dedicated `takeStartedRef` boolean, set on take
start and cleared only by explicit user action. Use that as the
`visibilitychange` condition instead of recorder state or chunk count.

**Relevant to Phase 3a.2** (permissions pre-flight) and **3a.5** (video link
sources) — both add more ways the page loses focus mid-take (external video,
file picker). Confirm the `takeStartedRef` fix (or equivalent) lands before
or alongside that work, not after.

### Bug D — Cue reordering has no touch equivalent (low priority, open, pre-existing)
Cue reordering in the Cues tab works via drag on desktop but has no touch
equivalent on mobile.

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
