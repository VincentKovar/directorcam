import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import OverlayRenderer from "./OverlayRenderer";

// Live camera feed. Used as the picture-in-picture thumbnail on the
// teleprompter screen. Recording overlays (title cards / image overlays)
// render inside this container so they sit over the video.
export default function CameraPreview({ className = "" }) {
  const { activeStream, facingMode } = useApp();
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeStream;
    }
  }, [activeStream]);

  return (
    <div className={`relative overflow-hidden bg-neutral-900 ${className}`}>
      {activeStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          // Mirror the front camera like a real teleprompter monitor would.
          style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-secondary">
          No camera
        </div>
      )}
      <OverlayRenderer scope="recording" />
    </div>
  );
}
