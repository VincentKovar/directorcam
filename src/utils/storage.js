// localStorage read/write helpers. All project data lives under one key.

import { migrateProject } from "./migrate";

export const STORAGE_KEY = "directorcam_project";
export const FONT_SIZE_KEY = "directorcam_fontsize";
export const PERMISSIONS_KEY = "directorcam_permissions";
export const PREVIEW_VISIBLE_KEY = "directorcam_preview_visible";

// Demo project loaded on first launch (nothing in localStorage).
// Covers all eight cue types so new users can see every feature in action.
export const DEMO_PROJECT = {
  project: {
    id: "proj_demo",
    title: "Demo — Talking-Head Workflow",
    script:
      "Welcome back. Today we are walking through a full talking-head workflow — framing, lighting, and the cue system that keeps everything on schedule. I am switching to the rear camera so you can see the room setup. Notice the key light angle and the clean background behind the subject. Now back to the front. Pull up slide one — the three-point lighting diagram. Key light at forty-five degrees, fill at half power opposite, back light to separate you from the background. Now I need to reposition the light stand — pausing the recording for a moment while I do that. And we are back. Hear that chime? That is the audio cue that a new segment has started. Here is a reference clip showing the same lighting setup on a professional set — I will let it play and then come back to us. Back to me. Keep your eyes on the lens, not the screen, whenever you want to look directly at camera. Last thing before we close: the channel logo comes up as a corner overlay automatically so you do not have to hold a sign. See you in the next one.",
    wpm: 130,
    createdAt: "2026-06-04T10:00:00Z",
    updatedAt: "2026-06-04T10:00:00Z",
    slideDeckUrl: "https://docs.google.com/presentation/d/YOUR_PRESENTATION_ID/present",
  },
  cueSheet: [
    {
      id: "cue_001",
      label: "Opening lower third",
      type: "title_card",
      trigger: { mode: "auto", scriptOffset: 0 },
      payload: {
        text: "Talking-Head Workflow",
        subtext: "DirectorCam demo",
        style: "lower_third",
        duration: 5000,
      },
      notes: "Fires on the first word. Replace text with your video title and episode number.",
    },
    {
      id: "cue_002",
      label: "Switch to rear cam — room setup",
      type: "camera_switch",
      trigger: { mode: "auto", scriptOffset: 147 },
      payload: { facing: "environment" },
      notes: "Fires at \"I am switching to the rear camera\". Shows the room from behind.",
    },
    {
      id: "cue_003",
      label: "Switch back to front cam",
      type: "camera_switch",
      trigger: { mode: "auto", scriptOffset: 284 },
      payload: { facing: "user" },
      notes: "Fires at \"Now back to the front\".",
    },
    {
      id: "cue_004",
      label: "Lighting diagram — slide 1",
      type: "static_screen",
      trigger: { mode: "auto", scriptOffset: 307 },
      payload: { slideNumber: 1, openIn: "tab" },
      notes: "Set your Google Slides present URL in Project Settings first. Fires at \"Pull up slide one\".",
    },
    {
      id: "cue_005",
      label: "Pause to reposition light stand",
      type: "pause_recording",
      trigger: { mode: "auto", scriptOffset: 471 },
      payload: { countdown: 8 },
      notes: "Auto-resumes after 8 seconds. Increase countdown if you need more time.",
    },
    {
      id: "cue_006",
      label: "Segment transition chime",
      type: "sound_effect",
      trigger: { mode: "auto", scriptOffset: 566 },
      payload: {
        src: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Bing_sound.ogg",
        volume: 0.7,
        loop: false,
      },
      notes: "Public domain chime from Wikimedia Commons. Replace with any direct-link MP3 or OGG URL.",
    },
    {
      id: "cue_007",
      label: "B-roll: pro set lighting clip",
      type: "video_link",
      trigger: { mode: "manual" },
      payload: {
        url: "https://www.youtube.com/watch?v=dCBmQg8oa6Y",
        openIn: "tab",
      },
      notes: "Manual trigger — tap in the Production tab when you reach \"Here is a reference clip\". Replace URL with your actual B-roll or reference video.",
    },
    {
      id: "cue_008",
      label: "Eye-line reminder",
      type: "note_flash",
      trigger: { mode: "auto", scriptOffset: 780 },
      payload: { text: "Eyes on the lens — not the screen", duration: 4000 },
      notes: "Private note visible only to you. Fires at \"Back to me\".",
    },
    {
      id: "cue_009",
      label: "Channel logo watermark",
      type: "image_overlay",
      trigger: { mode: "auto", scriptOffset: 882 },
      payload: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Camera_font_awesome.svg/240px-Camera_font_awesome.svg.png",
        position: "corner",
        duration: 8000,
      },
      notes: "Replace src with a direct link to your channel logo PNG. Fires at \"Last thing before we close\".",
    },
  ],
};

export function loadStoredProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.project || !Array.isArray(data.cueSheet)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveStoredProject(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — nothing actionable to do offline.
  }
}

export function loadOrSeedProject() {
  const data = loadStoredProject() || DEMO_PROJECT;
  return { ...data, project: migrateProject(data.project) };
}
