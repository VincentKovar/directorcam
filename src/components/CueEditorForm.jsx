import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { CUE_TYPES, CUE_TYPE_META, defaultPayload, buildSlideUrl } from "../engine/cueEngine";
import { wordAtOffset } from "../engine/teleprompterEngine";
import { nextCueId } from "../utils/idGen";

// Full-screen slide-up cue editor. Pass cue=null to create a new cue.
export default function CueEditorForm({ cue, onClose }) {
  const { project, cueSheet, saveCue, toast } = useApp();

  const [draft, setDraft] = useState(() =>
    cue
      ? JSON.parse(JSON.stringify(cue)) // edit a deep copy; Cancel discards
      : {
          id: nextCueId(cueSheet),
          label: "",
          type: "camera_switch",
          trigger: { mode: "auto", scriptOffset: 0 },
          payload: defaultPayload("camera_switch"),
          notes: "",
        }
  );

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setPayload = (patch) =>
    setDraft((d) => ({ ...d, payload: { ...d.payload, ...patch } }));

  const changeType = (type) =>
    // Changing type resets the payload to that type's defaults, per spec.
    setDraft((d) => ({ ...d, type, payload: defaultPayload(type) }));

  const save = () => {
    if (!draft.label.trim()) {
      toast("Give the cue a label", "error");
      return;
    }
    const clean = {
      ...draft,
      label: draft.label.trim(),
      trigger: {
        mode: draft.trigger.mode,
        scriptOffset: Math.min(
          Math.max(0, Math.round(Number(draft.trigger.scriptOffset) || 0)),
          Math.max(0, project.script.length)
        ),
      },
    };
    saveCue(clean);
    onClose();
  };

  const offsetWord = wordAtOffset(project.script, Number(draft.trigger.scriptOffset) || 0);

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-black/60">
      <div onClick={onClose} className="flex-1" />
      <div className="flex max-h-[92%] flex-col rounded-t-2xl border-t border-neutral-700 bg-surface">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-base font-semibold text-white">
            {cue ? "Edit cue" : "New cue"}
          </h2>
          <button onClick={onClose} className="min-h-[44px] px-3 text-sm text-secondary">
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Field label="Label">
            <input
              type="text"
              value={draft.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="Human-readable cue name"
              className={inputCls}
            />
          </Field>

          <Field label="Type">
            <select
              value={draft.type}
              onChange={(e) => changeType(e.target.value)}
              className={inputCls}
            >
              {CUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CUE_TYPE_META[t].name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Trigger">
            <div className="flex gap-2">
              <ToggleButton
                active={draft.trigger.mode === "auto"}
                onClick={() => set({ trigger: { ...draft.trigger, mode: "auto" } })}
              >
                ⚡ Auto
              </ToggleButton>
              <ToggleButton
                active={draft.trigger.mode === "manual"}
                onClick={() => set({ trigger: { ...draft.trigger, mode: "manual" } })}
              >
                👆 Manual
              </ToggleButton>
            </div>
          </Field>

          {draft.trigger.mode === "auto" && (
            <Field label="Script offset (character index)">
              <input
                type="number"
                min="0"
                max={project.script.length}
                value={draft.trigger.scriptOffset}
                onChange={(e) =>
                  set({
                    trigger: { ...draft.trigger, scriptOffset: Number(e.target.value) },
                  })
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-secondary">
                {offsetWord
                  ? `Fires at the word: “${offsetWord}”`
                  : "Script is empty — offset has no word to anchor to"}
              </p>
            </Field>
          )}

          <PayloadFields
            type={draft.type}
            payload={draft.payload}
            setPayload={setPayload}
            project={project}
          />

          <Field label="Private note — not shown during recording">
            <textarea
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={2}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="border-t border-neutral-800 p-4">
          <button
            onClick={save}
            className="min-h-[48px] w-full rounded-lg bg-accent font-semibold text-black"
          >
            Save cue
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-accent focus:outline-none";

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] flex-1 rounded border px-3 text-sm font-medium ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-neutral-700 text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function ScreenOnlyNotice() {
  return (
    <p className="mb-3 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-secondary">
      ℹ️ Appears on screen only — not in the recording file.
    </p>
  );
}

function PayloadFields({ type, payload, setPayload, project }) {
  switch (type) {
    case "camera_switch":
      return (
        <Field label="Facing direction">
          <div className="flex gap-2">
            <ToggleButton
              active={payload.facing !== "environment"}
              onClick={() => setPayload({ facing: "user" })}
            >
              Front
            </ToggleButton>
            <ToggleButton
              active={payload.facing === "environment"}
              onClick={() => setPayload({ facing: "environment" })}
            >
              Rear
            </ToggleButton>
          </div>
        </Field>
      );

    case "video_link":
      return (
        <>
          <Field label="Video URL">
            <input
              type="url"
              value={payload.url || ""}
              onChange={(e) => setPayload({ url: e.target.value })}
              placeholder="https://youtu.be/VIDEO_ID?t=90"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-secondary">
              For YouTube, add ?t=90 to start at 90 seconds
            </p>
          </Field>
          <OpenInToggle value={payload.openIn} onChange={(v) => setPayload({ openIn: v })} />
        </>
      );

    case "static_screen":
      return (
        <>
          {!project.slideDeckUrl && (
            <p className="mb-3 rounded border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-accent">
              ⚠ No slide deck URL set. Add one in project settings.
            </p>
          )}
          <Field label="Slide number">
            <input
              type="number"
              min="1"
              value={payload.slideNumber ?? 1}
              onChange={(e) => setPayload({ slideNumber: Number(e.target.value) || 1 })}
              className={inputCls}
            />
            {project.slideDeckUrl && (
              <p className="mt-1 break-all text-xs text-secondary">
                {buildSlideUrl(project.slideDeckUrl, payload.slideNumber ?? 1)}
              </p>
            )}
          </Field>
          <OpenInToggle value={payload.openIn} onChange={(v) => setPayload({ openIn: v })} />
        </>
      );

    case "sound_effect":
      return (
        <>
          <Field label="Audio URL">
            <input
              type="url"
              value={payload.src || ""}
              onChange={(e) => setPayload({ src: e.target.value })}
              placeholder="https://example.com/sound.mp3"
              className={inputCls}
            />
          </Field>
          <Field label={`Volume — ${Math.round((payload.volume ?? 0.8) * 100)}%`}>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((payload.volume ?? 0.8) * 100)}
              onChange={(e) => setPayload({ volume: Number(e.target.value) / 100 })}
              className="h-11 w-full accent-amber-500"
            />
          </Field>
          <Field label="Loop">
            <div className="flex gap-2">
              <ToggleButton active={!payload.loop} onClick={() => setPayload({ loop: false })}>
                Play once
              </ToggleButton>
              <ToggleButton active={!!payload.loop} onClick={() => setPayload({ loop: true })}>
                Loop
              </ToggleButton>
            </div>
            <p className="mt-1 text-xs text-secondary">
              Looping sounds stop automatically on pause or camera switch.
            </p>
          </Field>
        </>
      );

    case "title_card":
      return (
        <>
          <ScreenOnlyNotice />
          <Field label="Text">
            <input
              type="text"
              value={payload.text || ""}
              onChange={(e) => setPayload({ text: e.target.value })}
              placeholder="Chapter 2: Setup"
              className={inputCls}
            />
          </Field>
          <Field label="Subtext (optional)">
            <input
              type="text"
              value={payload.subtext || ""}
              onChange={(e) => setPayload({ subtext: e.target.value })}
              placeholder="Tools you will need"
              className={inputCls}
            />
          </Field>
          <Field label="Style">
            <div className="flex gap-2">
              <ToggleButton
                active={payload.style === "full"}
                onClick={() => setPayload({ style: "full" })}
              >
                Full frame
              </ToggleButton>
              <ToggleButton
                active={payload.style !== "full"}
                onClick={() => setPayload({ style: "lower_third" })}
              >
                Lower third
              </ToggleButton>
            </div>
          </Field>
          <DurationField payload={payload} setPayload={setPayload} />
        </>
      );

    case "image_overlay":
      return (
        <>
          <ScreenOnlyNotice />
          <Field label="Image URL">
            <input
              type="url"
              value={payload.src || ""}
              onChange={(e) => setPayload({ src: e.target.value })}
              placeholder="https://example.com/logo.png"
              className={inputCls}
            />
          </Field>
          <Field label="Position">
            <div className="flex gap-2">
              {[
                ["full", "Full"],
                ["lower_third", "Lower third"],
                ["corner", "Corner"],
              ].map(([v, label]) => (
                <ToggleButton
                  key={v}
                  active={(payload.position || "corner") === v}
                  onClick={() => setPayload({ position: v })}
                >
                  {label}
                </ToggleButton>
              ))}
            </div>
          </Field>
          <DurationField payload={payload} setPayload={setPayload} />
        </>
      );

    case "pause_recording":
      return (
        <Field label="Countdown before auto-resume (seconds)">
          <input
            type="number"
            min="0"
            value={payload.countdown ?? 0}
            onChange={(e) => setPayload({ countdown: Math.max(0, Number(e.target.value) || 0) })}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-secondary">0 = pause until you tap resume</p>
        </Field>
      );

    case "note_flash":
      return (
        <>
          <Field label="Private note text">
            <input
              type="text"
              value={payload.text || ""}
              onChange={(e) => setPayload({ text: e.target.value })}
              placeholder="Slow down — you are rushing"
              className={inputCls}
            />
          </Field>
          <DurationField payload={payload} setPayload={setPayload} />
        </>
      );

    default:
      return null;
  }
}

// Duration stored in ms in the payload, but edited in seconds for humans.
function DurationField({ payload, setPayload }) {
  return (
    <Field label="Duration (seconds, 0 = manual dismiss)">
      <input
        type="number"
        min="0"
        step="0.5"
        value={(payload.duration ?? 0) / 1000}
        onChange={(e) =>
          setPayload({ duration: Math.max(0, Number(e.target.value) || 0) * 1000 })
        }
        className={inputCls}
      />
    </Field>
  );
}

function OpenInToggle({ value, onChange }) {
  return (
    <Field label="Open in">
      <div className="flex gap-2">
        <ToggleButton active={value !== "pip"} onClick={() => onChange("tab")}>
          New tab
        </ToggleButton>
        <ToggleButton active={value === "pip"} onClick={() => onChange("pip")}>
          Picture-in-picture
        </ToggleButton>
      </div>
      <p className="mt-1 text-xs text-secondary">
        PiP needs a direct media URL; if it fails, the link opens in a tab.
      </p>
    </Field>
  );
}
