# CLAUDE.md — Project Context for Claude Code

Read this file at the start of every session on DirectorCam. It holds the
ground rules that don't change from phase to phase. Task-specific work lives
in `plan.md`; open bugs live in `BUGS.md`; product scope and reasoning live
in `PRD.md`.

## What this project is

DirectorCam is a browser-only teleprompter and solo video production tool.
One person records video and the app fires camera switches, overlays, sound
effects, and pauses on cue, so the footage looks like a small crew was
coordinating it. No accounts, no uploads, no backend (yet — Phase 3b adds
optional Google Drive sync).

## Stack

- React 18 + Vite + Tailwind CSS
- No backend, no database. State lives in `AppContext.jsx` and browser
  storage (`localStorage` / IndexedDB, not `localStorage` alone once video
  file caching lands in Phase 3a)
- No test framework currently installed — see "Testing" below

## File map

| Path | What lives there |
|---|---|
| `src/engine/cueEngine.js` | Cue types, cue firing logic, defaults |
| `src/engine/teleprompterEngine.js` | Word/scroll position math |
| `src/context/AppContext.jsx` | All app state: recording, permissions, camera, playback |
| `src/screens/Teleprompter.jsx` | Recording screen — script scroll, camera preview, take controls |
| `src/screens/Cues.jsx` | Cue sheet editor |
| `src/screens/Production.jsx` | Live cue-tracking view during a take |
| `src/components/CueEditorForm.jsx` | Add/edit form for a single cue |
| `src/components/CameraPreview.jsx` | Live camera feed component |
| `src/utils/migrate.js` | Project schema version migration |
| `src/utils/storage.js` | Read/write project data |

## Working principles (non-negotiable)

- **Keep phases separate.** Do not combine phases into a single prompt
  without explicit direction from Vincent. Within a phase that has multiple
  sub-tasks (see `plan.md`), still run each sub-task as its own session
  unless told otherwise.
- **Fresh Claude Code session per phase (or sub-task).**
- **Diagnose before fixing.** Grep for the actual code and confirm the bug's
  real cause before writing a fix. Do not fix from memory of a prior
  conversation.
- **GitHub is the source of truth, not the local folder.** Confirm the repo
  state before starting work if there's any doubt.
- **Never place the working folder inside Dropbox, iCloud, or OneDrive.**
  Sync services have caused silent write failures before.
- **Meta-prompt complex or architectural prompts through Gemini Flash
  (extended thinking) before running them in Claude Code.** Cue Vincent
  first — he runs the meta-prompt step himself. Single-file targeted fixes
  don't need this step.
- **Test on a real device before moving to the next phase or sub-task.**
- **Always push to GitHub at the end of every session**, even partial work,
  with a clear commit message describing what changed and what's still open.

## Model and effort guidance

- Flag it to Vincent whenever a task would benefit from a different model or
  thinking mode than what's currently active, rather than silently proceeding
  with a suboptimal one.
- Rough guide: layout/CSS-only changes and single-file fixes → default
  model, no extended thinking needed. Anything touching `AppContext.jsx`,
  recording lifecycle, permissions, or cue-timing interactions → recommend
  extended thinking, since these are the areas that have caused regressions
  before (see `BUGS.md`).
- Be token-usage aware. Prefer targeted diffs over re-generating whole files.
  Say so if a task is likely to be expensive, so Vincent can decide whether
  to proceed.

## Testing and regression prevention

- No automated test suite exists yet. Until one does: after any change to
  recording, permissions, cue firing, or teleprompter scroll/layout, do a
  manual pass on both desktop Chrome and a real mobile device before
  considering the task done.
- Add `console.log` / `logError` (see `src/utils/errorLog.js`) at meaningful
  state transitions when building new features that touch shared state
  (recording, permissions, mute/pause), so problems are traceable without
  re-instrumenting later.
- Before closing out a phase, update `BUGS.md` — check off fixed bugs, log
  any new ones found during testing.
