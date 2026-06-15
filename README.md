# DirectorCam

DirectorCam is a solo video production coordination tool that runs entirely in
your browser. It combines a teleprompter, a director's production view, and a
cue sheet editor so one person can record video that looks like a small crew
was coordinating it. Everything stays on your device — no accounts, no uploads,
no backend.

**Who it's for:** vloggers, educators, and workshop presenters who record alone
but want camera switches, title cards, sound effects, and slide changes to
happen on cue while they read.

## How to use it

1. **Write your script.** Tap the gear icon (top right) and paste or type your
   full script. Set your reading speed (words per minute).
2. **Add cues.** On the **Cues** tab, add events — camera switches, title
   cards, sound effects, slides — anchored to character positions in your
   script, or set to manual.
3. **Check the Production tab.** It shows your script with every cue marked
   inline, and tracks your position live as you read.
4. **Tap record** on the **Teleprompter** tab, then tap play and read. Auto
   cues fire as you pass them; the recording downloads as a `.webm` file when
   you stop.

### Teleprompter controls

| Desktop | Mobile | Action |
| --- | --- | --- |
| Space | Single tap | Play / pause |
| ↑ / ↓ | Swipe up / down | Speed ±5 WPM |
| ← | Two-finger tap | Jump back 10 words (re-arms passed cues) |
| → | — | Jump forward 10 words |
| Hold Shift | Two-finger hold | Slow mode (40% speed) |
| — | Pinch | Adjust text size |

## Cue types

| Type | What it does |
| --- | --- |
| **Camera switch** | Swaps between front and rear camera (cycles webcams on desktop) |
| **Video link** | Opens a video URL (e.g. YouTube with `?t=90`) in a new tab or picture-in-picture |
| **Static screen** | Opens a specific slide of your Google Slides deck in a new tab |
| **Sound effect** | Plays an audio file from a URL, with volume and loop control |
| **Title card** | Shows a text overlay (full frame or lower third) over the camera preview |
| **Image overlay** | Shows an image (full, lower third, or corner) over the camera preview |
| **Pause recording** | Pauses the recording and the scroll, with an optional auto-resume countdown |
| **Note flash** | Flashes a private yellow note to you, the presenter — never the audience |

Cues can fire **automatically** at a character position in your script, or
**manually** from a Fire button in the Production view.

## Important limitation: overlays are screen-only

Title cards, image overlays, and note flashes are DOM elements rendered over
the camera preview. They appear on **your screen** while you record, but they
are **not** in the downloaded recording file — MediaRecorder captures the raw
camera stream, not the page. Treat them as presenter guidance, or add graphics
in your video editor afterwards. (Note flashes are private by design and are
additionally kept visually distinct with a yellow "PRIVATE NOTE" style.)

Also note: switching cameras mid-recording updates the on-screen preview, but
the recording stays bound to the camera that was active when you pressed
record. For multi-camera output, record each section separately.

## Deploying to GitHub Pages

```bash
npm install
npm run build      # outputs a ready-to-deploy /dist folder
```

1. Push this repository to GitHub.
2. Either commit `/dist` to a `gh-pages` branch (`git subtree push --prefix
   dist origin gh-pages`) or use an action like `peaceiris/actions-gh-pages`.
3. In your repo: **Settings → Pages**, set the source to the `gh-pages` branch
   (root).

The build uses relative paths throughout (including `start_url: "./"` in the
manifest), so it works from a project subpath like
`https://you.github.io/directorcam/` without configuration. Camera and
microphone access require HTTPS, which GitHub Pages provides.

## Packaging for app stores

To ship DirectorCam to the Google Play Store (or Microsoft Store) as a real
installable app, use [PWABuilder](https://www.pwabuilder.com): enter your
deployed GitHub Pages URL, and PWABuilder validates the manifest and service
worker, then generates a signed Trusted Web Activity package for Android (and
equivalents for other stores) with no code changes required. The PWA already
meets PWABuilder's baseline: installable manifest, icons, and an offline-capable
service worker.

---

Built with DirectorCam schema v0.1
