// fireCue logic for each cue type.
//
// fireCue is pure dispatch: it receives the cue plus a `ctx` object of
// capabilities provided by AppContext (camera switching, overlay management,
// playback control, the audio-instance registry). Keeping this out of React
// makes the firing behaviour auditable in one place.

export const CUE_TYPES = [
  "camera_switch",
  "video_link",
  "static_screen",
  "sound_effect",
  "title_card",
  "image_overlay",
  "pause_recording",
  "note_flash",
];

export const CUE_TYPE_META = {
  camera_switch: { badge: "CAM", bg: "#1D4ED8", fg: "#FFFFFF", name: "Camera switch" },
  video_link: { badge: "VIDEO", bg: "#7C3AED", fg: "#FFFFFF", name: "Video link" },
  static_screen: { badge: "SLIDE", bg: "#0F766E", fg: "#FFFFFF", name: "Static screen" },
  sound_effect: { badge: "SFX", bg: "#B45309", fg: "#FFFFFF", name: "Sound effect" },
  title_card: { badge: "TITLE", bg: "#166534", fg: "#FFFFFF", name: "Title card" },
  image_overlay: { badge: "IMG", bg: "#166534", fg: "#FFFFFF", name: "Image overlay" },
  pause_recording: { badge: "PAUSE", bg: "#991B1B", fg: "#FFFFFF", name: "Pause recording" },
  note_flash: { badge: "NOTE", bg: "#374151", fg: "#FFFFFF", name: "Note flash" },
};

// Default payloads used when creating a cue or switching type in the editor.
export function defaultPayload(type) {
  switch (type) {
    case "camera_switch":
      return { facing: "environment" };
    case "video_link":
      return { url: "", openIn: "tab" };
    case "static_screen":
      return { slideNumber: 1, openIn: "tab" };
    case "sound_effect":
      return { src: "", volume: 0.8, loop: false };
    case "title_card":
      return { text: "", subtext: "", style: "lower_third", duration: 4000 };
    case "image_overlay":
      return { src: "", position: "corner", duration: 5000 };
    case "pause_recording":
      return { countdown: 5 };
    case "note_flash":
      return { text: "", duration: 3000 };
    default:
      return {};
  }
}

// One-line payload summary shown in the cue list.
export function payloadSummary(cue, project) {
  const p = cue.payload || {};
  switch (cue.type) {
    case "camera_switch":
      return `-> ${p.facing === "environment" ? "rear" : "front"}`;
    case "video_link":
      return shortenUrl(p.url) || "(no URL)";
    case "static_screen":
      return `Slide ${p.slideNumber ?? "?"}${project?.slideDeckUrl ? "" : " -- no deck URL!"}`;
    case "sound_effect":
      return `${shortenUrl(p.src) || "(no URL)"}${p.loop ? " (loop)" : ""}`;
    case "title_card":
      return `"${p.text || ""}" - ${p.style === "full" ? "full frame" : "lower third"}`;
    case "image_overlay":
      return `${shortenUrl(p.src) || "(no URL)"} - ${p.position || "corner"}`;
    case "pause_recording":
      return p.countdown > 0 ? `Resume after ${p.countdown}s` : "Manual resume";
    case "note_flash":
      return `"${p.text || ""}"`;
    default:
      return "";
  }
}

function shortenUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const s = u.host.replace(/^www\./, "") + u.pathname + u.search;
    return s.length > 40 ? s.slice(0, 39) + "..." : s;
  } catch {
    return url.length > 40 ? url.slice(0, 39) + "..." : url;
  }
}

export function buildSlideUrl(slideDeckUrl, slideNumber) {
  return `${slideDeckUrl}#slide=id.p${slideNumber}`;
}

/**
 * Execute a cue.
 *
 * ctx must provide:
 *   switchCamera(facing)          -- swap the active camera stream
 *   addOverlay(overlay)           -- push an overlay onto activeOverlays
 *   pausePlayback({countdown})    -- pause scroll + MediaRecorder, optional auto-resume
 *   stopLoopingSounds()           -- pause any Audio instances with loop=true
 *   audioMap                      -- Map<cueId, HTMLAudioElement> registry
 *   sharedAudioContext            -- AudioContext created on first user gesture (may be null)
 *   project                       -- current project (for slideDeckUrl)
 *   toast(message, kind)          -- user feedback for failures
 */
export function fireCue(cue, ctx) {
  const p = cue.payload || {};
  switch (cue.type) {
    case "camera_switch": {
      // Per spec, looping sounds stop when a camera switch fires.
      ctx.stopLoopingSounds();
      ctx.switchCamera(p.facing === "environment" ? "environment" : "user");
      break;
    }

    case "video_link": {
      if (!p.url) {
        ctx.toast("Video link cue has no URL", "error");
        break;
      }
      if (p.openIn === "pip") {
        openVideoInPip(p.url).catch(() => {
          // Cross-origin pages cannot be loaded into a <video> element, so
          // PiP will reject -- fall back to a tab per spec.
          window.open(p.url, "_blank");
        });
      } else {
        window.open(p.url, "_blank");
      }
      break;
    }

    case "static_screen": {
      if (!ctx.project.slideDeckUrl) {
        ctx.toast("No slide deck URL set in project settings", "error");
        break;
      }
      window.open(buildSlideUrl(ctx.project.slideDeckUrl, p.slideNumber ?? 1), "_blank");
      break;
    }

    case "sound_effect": {
      if (!p.src) {
        ctx.toast("Sound effect cue has no URL", "error");
        break;
      }
      // Stop a previous instance of the same cue before re-firing.
      const existing = ctx.audioMap.get(cue.id);
      if (existing) {
        existing.pause();
        ctx.audioMap.delete(cue.id);
      }
      const audio = new Audio(p.src);
      audio.loop = !!p.loop;
      const volume = Math.min(1, Math.max(0, Number(p.volume) || 0.8));

      // Route through the shared AudioContext when available so that playback
      // is unblocked on mobile Safari/Chrome -- the context was created on the
      // "Start Take" user gesture and remains unlocked for the session.
      const ac = ctx.sharedAudioContext;
      if (ac && ac.state !== "closed") {
        const source = ac.createMediaElementSource(audio);
        const gainNode = ac.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(ac.destination);
      } else {
        audio.volume = volume;
      }

      ctx.audioMap.set(cue.id, audio);
      audio.addEventListener("ended", () => {
        if (ctx.audioMap.get(cue.id) === audio) ctx.audioMap.delete(cue.id);
      });
      audio.play().catch(() => ctx.toast("Could not play sound effect", "error"));
      break;
    }

    case "title_card": {
      ctx.addOverlay({
        id: `${cue.id}_${Date.now()}`,
        type: "title_card",
        text: p.text || "",
        subtext: p.subtext || "",
        style: p.style === "full" ? "full" : "lower_third",
        duration: Number(p.duration) || 0,
      });
      break;
    }

    case "image_overlay": {
      ctx.addOverlay({
        id: `${cue.id}_${Date.now()}`,
        type: "image_overlay",
        src: p.src || "",
        position: p.position || "corner",
        duration: Number(p.duration) || 0,
      });
      break;
    }

    case "pause_recording": {
      // Per spec, looping sounds stop when pause_recording fires.
      ctx.stopLoopingSounds();
      ctx.pausePlayback({ countdown: Number(p.countdown) || 0 });
      break;
    }

    case "note_flash": {
      ctx.addOverlay({
        id: `${cue.id}_${Date.now()}`,
        type: "note_flash",
        text: p.text || "",
        duration: Number(p.duration) || 0,
      });
      break;
    }

    default:
      ctx.toast(`Unknown cue type: ${cue.type}`, "error");
  }
}

// Attempt browser picture-in-picture for a direct media URL. Rejects if the
// media can't load or PiP is unavailable, so callers can fall back to a tab.
function openVideoInPip(url) {
  return new Promise((resolve, reject) => {
    if (!document.pictureInPictureEnabled) {
      reject(new Error("PiP not supported"));
      return;
    }
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.style.position = "fixed";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    document.body.appendChild(video);
    const cleanupFail = (err) => {
      video.remove();
      reject(err);
    };
    video.addEventListener("error", () => cleanupFail(new Error("Media failed to load")));
    video
      .play()
      .then(() => video.requestPictureInPicture())
      .then(() => {
        video.addEventListener("leavepictureinpicture", () => {
          video.pause();
          video.remove();
        });
        resolve();
      })
      .catch(cleanupFail);
  });
}
