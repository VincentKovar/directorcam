import React from "react";
import { useApp } from "../context/AppContext";

// Brief status messages, stacked above the tab bar.
export default function Toast() {
  const { toasts } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-md rounded px-4 py-2 text-sm text-white shadow-lg ${
            t.kind === "error"
              ? "bg-red-800"
              : t.kind === "success"
                ? "bg-green-800"
                : "bg-neutral-700"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
