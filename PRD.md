# DirectorCam — Product Requirements Document

## Problem

Solo video creators (vloggers, educators, workshop presenters, tour guides)
lose time and quality in post-production because they're recording alone:
no one to call "cut," switch cameras, hold up a title card, or cue a sound
effect. DirectorCam moves those decisions to *before* the take, as a cue
sheet, and fires them live while the creator reads from a teleprompter. The
goal is footage that needs little or no editing afterward.

## Who it's for, and the two use cases that shape everything

**Primary use case — field recording.** A creator sets up a script and cue
sheet on a PC, where typing and precise cue placement are easiest, then
takes a mobile device out into the world to record. Example: a tour guide
writes her script and cues at a desk, then walks to a landmark with her
phone. She records herself talking; a cue switches to the rear camera aimed
at the landmark; a sound effect and title card fire; the channel watermark
is visible throughout; a short pre-loaded b-roll clip plays over part of the
shot. Everything from this point on has to work with unreliable signal and
no browser tabs popping over the camera view.

**Secondary use case — desktop recording.** A creator records at a desk,
closer to the original "Visual Communicator" style of studio production.
Here, cutting to a browser-based video (YouTube, a Drive-hosted clip) mid-take
is reasonable, since there's no mobility constraint and a browser tab isn't
disruptive in the same way.

These two use cases have different constraints, and the cue system should
be scoped by which one it's serving rather than building one feature set
that tries to satisfy both.

## Core principles

- Runs entirely in the browser. No accounts, no uploads, no backend for the
  core recording workflow.
- Stability over breadth: fewer functions that work reliably beats many that
  don't.
- The creator should never have to break reading focus, lose recording
  context, or depend on a live network connection to manage a cue while in
  the field.

## Feature set (by cue type)

| Type | What it does | Mode | Appears in recording? |
|---|---|---|---|
| Camera switch | Swaps front/rear camera (cycles webcams on desktop) | Both | Yes — this changes the live feed |
| B-roll clip | Plays a short, pre-loaded local video or audio clip inline | Field + desktop | Video: yes, if composited; audio: yes |
| Video link (desktop only) | Plays a video (YouTube or a direct URL) in a tab or picture-in-picture | Desktop only | Screen only |
| Image overlay | Shows an image (full frame, lower third, or corner) over the camera preview | Both | Screen only |
| Sound effect | Plays an audio file, with volume and loop control | Both | Audio only |
| Title card | Text overlay (full frame or lower third) | Both | Screen only |
| Pause recording | Pauses the recording and the scroll, with optional auto-resume countdown | Both | N/A |
| Note flash | Private yellow note to the presenter only | Both | Never — presenter-only by design |

**Removed in this phase:** the "Static screen" cue type, which built a
Google Slides deep-link URL from a stored slide deck URL. Slide-style visuals
are now handled through the existing **Image overlay** cue type instead:
export the slide as an image and use it like any other overlay. This is
simpler, works offline, and matches the Phase 4 decision already logged to
replace new-tab slide navigation with on-screen overlays.

**Removed in this phase: live external video (YouTube/Drive) as a field
cue.** Standing at a landmark with a phone, opening a browser tab over the
camera view mid-take is disruptive, and signal at a location shoot can't be
counted on. The original plan to support YouTube, local file, and Google
Drive as video-cue sources for *any* recording is cut back to:

- **B-roll clip (new, both modes):** a short video or audio file the creator
  picks once before recording, cached locally on the device (IndexedDB), and
  played inline with no network dependency and no new tab. This is what the
  tour guide's b-roll cue actually needs.
- **Video link (desktop only, unchanged from the original build):** stays a
  bare URL opened in a tab or PiP, for YouTube or any direct link. No new
  sources added. Gated off in field/mobile mode.

This removes the Google Drive-as-a-video-source question entirely. Drive's
role in this product is now limited to syncing the script/cue-sheet project
file and uploading the finished recording after the shoot, both of which can
happen on a stable connection, not live during a take.

**New: Channel watermark (project setting, not a cue).** A persistent logo
shown throughout recording doesn't need to be scripted or triggered — it's
a project-level setting, on by default, similar to a broadcast bug. Simpler
than a cue, and matches how creators actually think about branding.

**Important limitation, unchanged:** overlays (image, title card, note
flash, watermark) are on-screen only. `MediaRecorder` captures the raw
camera stream, not the page, so none of these appear in the downloaded file.
They're presenter guidance or a note-to-self-in-post, not part of the final
video. This limitation applies to the watermark too; a future phase might
composite the watermark into the recorded output via canvas if that turns
out to matter to creators — noted for later, not v1.

## Recording pre-flight: permissions

Before a take can start, the creator needs camera and microphone access. If
the cue sheet references a B-roll clip, confirm the file is actually cached
and ready before recording starts, not discovered missing mid-take. Video
link cues (desktop-only) similarly deserve a check that the destination is
reachable if practical, though a dead link there is lower-stakes than a
failed field cue. Add a pre-flight check that runs when the creator opens
the Teleprompter tab (or taps Start), listing what this specific project
needs and confirming it's ready before the countdown begins. If something's
missing or was denied, say so plainly and explain the effect of proceeding
without it, rather than failing silently mid-take.

## Teleprompter tab layout (this phase)

- Camera preview moves from a small corner thumbnail to roughly 3/5 of the
  space above the tab bar, positioned below the existing top menu bar
  (download, upload, settings). Sized to fit mobile screens edge-to-edge
  width-wise without distortion, regardless of device aspect ratio.
- Teleprompter script text moves to the remaining ~2/5 above the camera,
  directly under the top menu bar. This intentionally reduces visible lines
  to roughly 4–5. Font size and line spacing stay exactly as they are now —
  that sizing is already correct for readability.
- WPM control and Start/Reset Take button stay as-is.
- **New: Pause button.** Same visual style as the take button, a
  coordinating but distinct color. Toggles on/off. This is a manual,
  unplanned-use pause — the creator taps it if something goes wrong or they
  need a beat. Distinct from the "Pause recording" cue type, which is
  pre-programmed to fire at a specific script position.
- **New: Mute button.** Mutes the microphone only. Sound effect, B-roll, and
  video link cue audio continue to play and be audible even while muted.
  Unmuting restores mic input; both mic and cue audio are active
  simultaneously when unmuted.

## Full roadmap

### Phase 3a: Recording Workflow & Layout Overhaul (active, expanded scope)
- Codebase audit and minimal smoke-test harness (do this first — see
  `plan.md`)
- Cue type cleanup: remove Static screen; scope Video link as desktop-only;
  confirm Image overlay covers the slide use case
- New B-roll clip cue type: local file only, cached via IndexedDB, no
  network dependency, works in the field
- New: channel watermark as a persistent project setting
- Recording pre-flight permissions/readiness check (camera, mic, cached
  B-roll files)
- Teleprompter layout: enlarged/repositioned camera preview, compressed
  script area, unchanged font sizing
- New Pause (freeze everything) and Mute (mic-only) controls
- Original Phase 3a scope: download dialog (device / Drive-coming-soon),
  named-project filenames, save confirmation toast

### Phase 3b: Google Drive Sync (separate session, high complexity)
- Google Drive OAuth, narrow scope (`drive.file` — access only to what
  DirectorCam creates, not the creator's whole Drive)
- Save to Drive exports the project JSON (script + cue sheet) to a
  DirectorCam folder
- Load from Drive imports and runs through `migrate.js`
- Upload the finished recording to Drive after a take, on-demand, when
  connectivity allows — not a live dependency during recording
- Enables desktop-to-field workflow: write on desktop, record on mobile,
  upload the result when back on wifi

### Phase 4: Production View Enhancements
- Tap a word in Production view to open the cue editor pre-targeted to that
  position
- Visual indicator for fired vs. pending cues in the current take
- Manual fire button accessible without leaving the Production tab
- Any remaining slide/image-overlay UX polish

### Phase 5: Cue System Additions
- Browse button for local files when entering B-roll or Video link cues
- URL validation on save (desktop Video link cues)
- Duplicate cue button

### Phase 6: Polish and Onboarding
- Adjustable reading line position (top / upper third / center)
- Default to top-anchored scroll on desktop
- Improved first-launch tooltip
- Camera zoom preference saved in settings
- App icon/name reviewed for store readiness

### Phase 7: Testing
- Cross-device: iOS Safari, Android Chrome, desktop Chrome, desktop Safari
- Cross-scenario: short/long/multi-take sessions, field shoot with poor
  signal
- Edge cases: no camera permission, no mic, very long script, zero cues,
  missing/uncached B-roll file
- PWABuilder validation against the live Netlify URL
- One real-world use: record an actual workshop or field segment

### Phase 8: Deployment
- Push final build to GitHub
- Run PWABuilder, generate Android package
- Domain setup if pursuing Gumroad or subscription
- Store listing copy

## Monetization & launch (short-form, revisit closer to Phase 9)

Model still open: Gumroad one-time purchase, web subscription, or free
portfolio piece. Plan includes a demo video recorded with DirectorCam itself,
a simple landing page, a LinkedIn post/portfolio write-up, and outreach to
educator Facebook groups, YouTuber subreddits, and workshop presenter forums.

## Non-goals (v1)

- Simultaneous multi-camera capture into one recording (switching mid-take
  changes the live preview but the recording stays on the camera active at
  record-start; multi-angle output means recording each angle separately)
- Cloud accounts or login for the core recording workflow
- Editing the recorded video inside the app
- Live-fetching external video (YouTube or Drive) as a field/mobile cue —
  desktop-only, see Video link above
- Storing end-user script or video files in GitHub. GitHub remains the
  developer's source-code repository for the app itself; Google Drive is the
  only user-facing storage/sync destination
