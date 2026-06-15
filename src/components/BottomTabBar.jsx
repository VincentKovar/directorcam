import React from "react";

// Persistent bottom tab bar. Always visible; active tab indicated with the
// amber accent. All targets are >= 44px tall.
const TABS = [
  {
    id: "teleprompter",
    label: "Teleprompter",
    // Play-button-with-text-lines icon
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 5h16M4 9h10M4 13h7" />
        <path d="M14 13l7 4-7 4v-8z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "production",
    label: "Production",
    // Film slate icon
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="18" height="11" rx="1" />
        <path d="M3 9l1.5-4.5L21 6l-1 3" />
        <path d="M8 5.2L10 9M13 5.8L15 9" />
      </svg>
    ),
  },
  {
    id: "cues",
    label: "Cues",
    // List / event marker icon
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 6h12M9 12h12M9 18h12" />
        <circle cx="4" cy="6" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function BottomTabBar({ activeTab, onSelect }) {
  return (
    <nav className="flex shrink-0 border-t border-neutral-800 bg-surface">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 border-t-2 px-2 py-1.5 text-xs ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-secondary"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
