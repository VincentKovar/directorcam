// ID generation for projects and cues.

// Project ids only need uniqueness per device, so a timestamp+random suffix
// is sufficient (no backend to collide with).
export function genProjectId() {
  return `proj_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Cue ids follow the spec format cue_NNN. We scan existing ids for the
// highest numeric suffix so imported projects keep their numbering.
export function nextCueId(cueSheet) {
  let max = 0;
  for (const cue of cueSheet) {
    const m = /^cue_(\d+)$/.exec(cue.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `cue_${String(max + 1).padStart(3, "0")}`;
}
