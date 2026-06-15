// localStorage read/write helpers. All project data lives under one key.

export const STORAGE_KEY = "directorcam_project";
export const FONT_SIZE_KEY = "directorcam_fontsize";
export const PERMISSIONS_KEY = "directorcam_permissions";
export const PREVIEW_VISIBLE_KEY = "directorcam_preview_visible";

// Demo project loaded on first launch (nothing in localStorage), verbatim
// from the spec, so the user has something to explore immediately.
export const DEMO_PROJECT = {
  project: {
    id: "proj_demo",
    title: "Demo — Workshop Intro",
    script:
      "Welcome to the workshop. Today we are covering three things: how to set up your space, how to frame your shot, and how to use DirectorCam to coordinate your recording. Let me show you the setup first. Here is what your recording space should look like. Notice the lighting position and the distance from the camera. Now let us talk about framing. The rule of thirds applies here. Place yourself slightly off-center and leave room for lower-third graphics. Finally, here is how the cue sheet works. Every event you see marked in the production view will fire automatically as you read the script at this pace. You can also trigger any event manually by tapping it in the production view.",
    wpm: 130,
    createdAt: "2026-06-04T10:00:00Z",
    updatedAt: "2026-06-04T10:00:00Z",
    slideDeckUrl: "",
  },
  cueSheet: [
    {
      id: "cue_001",
      label: "Opening title",
      type: "title_card",
      trigger: { mode: "auto", scriptOffset: 0 },
      payload: {
        text: "Workshop Intro",
        subtext: "Setting up your space",
        style: "lower_third",
        duration: 4000,
      },
      notes: "Fires immediately at the start",
    },
    {
      id: "cue_002",
      label: "Switch to rear camera",
      type: "camera_switch",
      trigger: { mode: "auto", scriptOffset: 198 },
      payload: { facing: "environment" },
      notes: "Show the room setup at this point",
    },
    {
      id: "cue_003",
      label: "Switch back to front",
      type: "camera_switch",
      trigger: { mode: "auto", scriptOffset: 312 },
      payload: { facing: "user" },
      notes: "",
    },
    {
      id: "cue_004",
      label: "Framing reminder",
      type: "note_flash",
      trigger: { mode: "auto", scriptOffset: 340 },
      payload: { text: "Step back — you are too close to the lens", duration: 4000 },
      notes: "",
    },
    {
      id: "cue_005",
      label: "Manual: fire applause SFX",
      type: "sound_effect",
      trigger: { mode: "manual" },
      payload: {
        src: "https://www.soundjay.com/human/applause-01.mp3",
        volume: 0.6,
        loop: false,
      },
      notes: "Tap manually whenever you want to use this",
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
  return loadStoredProject() || DEMO_PROJECT;
}
