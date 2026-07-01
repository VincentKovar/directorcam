# plan.md — Active Development Plan

This is the task list Claude Code should work from each session. See
`CLAUDE.md` for standing rules, `PRD.md` for the reasoning behind each item,
`BUGS.md` for open bugs.

## Model assignment for this phase

Fable 5 access is temporary (through July 7). It's built for long,
multi-hour autonomous work with self-correction, which matches the
cross-cutting, higher-risk items below. Front-load those onto Fable 5 now.
Everything else runs fine on Opus, now or after the window closes.

- **Fable 5, priority order:** 3a.0, 3a.0b, 3a.2, 3a.3, 3a.4
- **Opus, any time:** 3a.1, 3a.5, 3a.6, 3a.7, and all of Phase 3b onward

## Current phase: Phase 3a — Recording Workflow & Layout Overhaul

Treat each sub-task below as its own Claude Code session, even though
they're all filed under Phase 3a, per the "keep phases separate" rule.
Sequenced by dependency, not by request order.

### 3a.0 — Codebase audit (do this first, Fable 5)
- [ ] Read the full codebase against `PRD.md` and this plan; flag any
      structural risk areas before new feature work starts, especially
      around recording lifecycle, permission state, and cue timing
- [ ] Confirm Bug C's proposed fix (`takeStartedRef`) is actually the right
      shape given the new pre-flight and B-roll work about to land on the
      same code paths
- [ ] Report findings before making changes — this is a read/diagnose
      session, not a fix session
- Rationale: the original build was done in a very small number of prompts
  on a long-horizon autonomous model. That produces code that looks
  finished but can have shortcuts underneath. Cheaper to find them now than
  after three more phases are built on top.

### 3a.0b — Minimal smoke-test harness (Fable 5)
- [ ] Add a handful of sanity checks, not full test coverage: does a take
      start and stop cleanly, does a cue fire at its scripted position, does
      mute actually silence the mic track, does the recording survive a
      simulated tab-background event
- [ ] These become the pass/fail signal for every sub-task below — use them
      before marking a sub-task done, not just a visual check
- Rationale: there's no test suite right now, which means "done" currently
  means "looked right by eye." This closes that gap cheaply while Fable-tier
  capability is available for it.

### 3a.1 — Cue type cleanup (Opus)
- [ ] Remove the "Static screen" cue type from `CUE_TYPES` / `CUE_TYPE_META`
      in `src/engine/cueEngine.js`
- [ ] Remove its payload fields and `buildSlideUrl` usage from
      `CueEditorForm.jsx`
- [ ] Remove `slideDeckUrl` field from project settings UI
      (`ProjectSettings.jsx`) if it has no other use
- [ ] Gate the existing "Video link" cue type to desktop-only using the
      existing `IS_MOBILE` flag (already imported in `Teleprompter.jsx`) —
      hide it from the cue type picker in field/mobile mode rather than
      building new device-detection logic
- [ ] If `migrate.js` needs a step to convert old static_screen cues to
      image_overlay cues on load, add it there
- Model/effort: default model, no extended thinking needed

### 3a.2 — Recording pre-flight permissions and readiness check (Fable 5)
- [ ] Before a take can start, check camera and mic access, and confirm any
      referenced B-roll clip is actually cached and ready
- [ ] Surface a clear pre-flight screen/step listing what's needed and
      current status, before the countdown begins
- [ ] Handle "missing permission" or "missing B-roll file" gracefully —
      explain the effect of proceeding, don't fail silently mid-take
- Diagnose the current `startRecording` / `permission` state flow in
  `AppContext.jsx` before changing it (see Bug C history).

### 3a.3 — Teleprompter layout overhaul (Fable 5)
- [ ] Resize camera preview to ~3/5 of the space above the tab bar,
      positioned below the top menu bar
- [ ] Resize script area to the remaining ~2/5, directly under the top menu
      bar
- [ ] Confirm camera preview scales width-wise on mobile without distortion
      across different device aspect ratios
- [ ] Keep font size and line-height exactly as they are (`fontSize` +
      `lineHeight: 1.6` in `Teleprompter.jsx`) — do not change these values
- [ ] Re-test the reading-line scroll calculation
      (`area.clientHeight * 0.35` in the `useLayoutEffect` scroll effect)
      against the new, shorter script area on a real device

### 3a.4 — Pause and Mute controls (Fable 5)
- [ ] Add a Pause button next to Start/Reset Take: same visual style, a
      distinct but coordinating color. Toggles recording/scroll/cue-firing
      on and off as one unit. Separate from the existing "Pause recording"
      cue type (pre-programmed) — confirm the two don't conflict if a
      pre-programmed pause lands while manual pause is already active
- [ ] Add a Mute button: mutes the mic track only. Sound effect, B-roll, and
      video link cue audio continue playing regardless of mute state
- [ ] Confirm unmuting restores mic input while cue audio keeps playing
      simultaneously

### 3a.5 — B-roll clip cue type (new, Opus)
- [ ] New cue type: creator picks a local video or audio file once; cache it
      in IndexedDB keyed to the cue; playback reads from the cached file
      going forward — no network dependency, no OAuth, no new tab
- [ ] Surface a clear "re-link this file" state if the cached file is
      missing (e.g. project opened on a different device)
- [ ] Confirm it plays inline during a take without interrupting the camera
      view
- Model/effort: default model — this is now a much smaller build than the
  original multi-source video plan, since Drive/YouTube access was cut

### 3a.6 — Channel watermark project setting (Opus)
- [ ] Add a project-level setting for a persistent logo/watermark, on by
      default, rendered over the camera preview throughout recording
- [ ] Screen-only for now, same limitation as other overlays — note this
      clearly in the UI so creators aren't surprised it's absent from the
      downloaded file
- Model/effort: default model, low risk

### 3a.7 — Download dialog, project naming, save toast (Opus)
- [ ] Download dialog offers "Save to device" or "Save to Google Drive"
- [ ] "Save to Google Drive" shows a clearly designed "coming soon" state —
      no broken UI, no dead buttons
- [ ] Named projects: project title appears in the downloaded filename
- [ ] Script auto-save confirmation toast
- Model/effort: default model, low risk, no shared-state changes

## Up next (not started, kept brief until active)

- **Phase 3b** — Google Drive OAuth (narrow `drive.file` scope) + project
  sync + post-shoot video upload, high complexity, own session(s)
- **Phase 4** — Production view enhancements (tap-to-edit, fired/pending
  indicators, manual fire button, remaining overlay UX polish)

## End-of-session checklist (every sub-task above)

- [ ] Run the smoke-test checks from 3a.0b before marking the task done
- [ ] Test on a real device, not just desktop browser
- [ ] Update `BUGS.md` — check off anything fixed, log anything new found
- [ ] Push to GitHub with a commit message describing what changed and what
      in this sub-task is still open
