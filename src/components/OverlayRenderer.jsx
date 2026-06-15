import React from "react";
import { useApp } from "../context/AppContext";

/**
 * Renders activeOverlays as absolutely positioned DOM elements.
 *
 * scope="recording": title_card and image_overlay — rendered INSIDE the
 * camera preview container so they sit over the video. These appear on the
 * presenter's screen only; MediaRecorder records the raw camera stream, so
 * they are never in the downloaded file.
 *
 * scope="private": note_flash — rendered at the app root, fixed-position,
 * deliberately outside the camera preview subtree so it can never be confused
 * with (or composited into) recording-adjacent UI.
 */
export default function OverlayRenderer({ scope }) {
  const { activeOverlays, removeOverlay } = useApp();

  if (scope === "private") {
    const notes = activeOverlays.filter((o) => o.type === "note_flash");
    return (
      <>
        {notes.map((o) => (
          <div
            key={o.id}
            onClick={() => o.duration === 0 && removeOverlay(o.id)}
            className="fixed inset-x-3 top-16 z-[60] rounded-lg p-4 shadow-2xl"
            style={{ backgroundColor: "#FEF08A", color: "#000000" }}
          >
            <div className="text-[11px] font-bold uppercase tracking-widest">
              Private note
            </div>
            <div className="mt-1 text-lg font-semibold leading-snug">{o.text}</div>
            {o.duration === 0 && (
              <div className="mt-1 text-xs opacity-70">Tap to dismiss</div>
            )}
          </div>
        ))}
      </>
    );
  }

  // scope === "recording": overlays over the camera preview
  const overlays = activeOverlays.filter(
    (o) => o.type === "title_card" || o.type === "image_overlay"
  );
  return (
    <>
      {overlays.map((o) =>
        o.type === "title_card" ? (
          <TitleCard key={o.id} overlay={o} onDismiss={() => removeOverlay(o.id)} />
        ) : (
          <ImageOverlay key={o.id} overlay={o} onDismiss={() => removeOverlay(o.id)} />
        )
      )}
    </>
  );
}

function ScreenOnlyTag() {
  return (
    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/80">
      Screen only — not in recording
    </span>
  );
}

function TitleCard({ overlay, onDismiss }) {
  const manual = overlay.duration === 0;
  if (overlay.style === "full") {
    return (
      <div
        onClick={manual ? onDismiss : undefined}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 p-4 text-center"
      >
        <ScreenOnlyTag />
        <div className="text-2xl font-bold text-white">{overlay.text}</div>
        {overlay.subtext && (
          <div className="mt-2 text-base text-secondary">{overlay.subtext}</div>
        )}
        {manual && <div className="mt-3 text-xs text-white/50">Tap to dismiss</div>}
      </div>
    );
  }
  return (
    <div
      onClick={manual ? onDismiss : undefined}
      className="absolute inset-x-0 bottom-0 z-20 bg-black/75 px-3 py-2"
    >
      <ScreenOnlyTag />
      <div className="mt-3 text-sm font-bold leading-tight text-white">{overlay.text}</div>
      {overlay.subtext && (
        <div className="text-xs leading-tight text-secondary">{overlay.subtext}</div>
      )}
    </div>
  );
}

function ImageOverlay({ overlay, onDismiss }) {
  const manual = overlay.duration === 0;
  const positionClass =
    overlay.position === "full"
      ? "inset-0"
      : overlay.position === "lower_third"
        ? "inset-x-0 bottom-0 h-1/3"
        : "bottom-1 right-1 w-1/4"; // corner: bottom-right, 25% width
  return (
    <div
      onClick={manual ? onDismiss : undefined}
      className={`absolute z-20 ${positionClass}`}
    >
      <ScreenOnlyTag />
      <img
        src={overlay.src}
        alt=""
        className={`h-full w-full ${overlay.position === "corner" ? "object-contain" : "object-cover"}`}
      />
    </div>
  );
}
