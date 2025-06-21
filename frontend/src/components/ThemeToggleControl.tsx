// src/components/ThemeToggleControl.tsx
import React, { useId } from "react";
import { useTheme } from "../theme/ThemeContext";

export interface ThemeToggleControlProps {
  /** Called with the new mode after a click (optional) */
  onThemeChange?: (mode: "light" | "dark") => void;
  /** If true render only the SVG (no wrapper button, no click) */
  inline?: boolean;
}

/**
 * Click → toggles light ⇄ dark
 * Shows an animated sun / moon icon.
 */
const ThemeToggleControl: React.FC<ThemeToggleControlProps> = ({
  onThemeChange,
  inline = false,
}) => {
  /* read tokens (no setter lives in ThemeContext) */
  const { mode, text: textColor } = useTheme();

  /* click simply *notifies* the parent  */
  const handleClick = () => {
    const next = mode === "light" ? "dark" : "light";
    onThemeChange?.(next);
  };

  /* ─── SVG constants ─── */
  const uid = useId();
  const VIEWBOX = 40;
  const CENTER = VIEWBOX / 2;
  const CORE_RADIUS = 8;
  const RAY_COUNT = 8;
  const RAY_LEN = 5;
  const RAY_WID = 3;
  const RAY_GAP = 2;
  const MASK_RADIUS = CORE_RADIUS + 1;

  /* the actual art, reused in both render modes */
  const SunMoonSVG = (
    <svg
      width={VIEWBOX}
      height={VIEWBOX}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      style={{ display: "block", color: textColor }}
    >
      <mask id={`rayMask-${uid}`}>
        <rect width="100%" height="100%" fill="#fff" />
        <circle cx={CENTER} cy={CENTER} r={MASK_RADIUS} fill="#000" />
      </mask>
      {/* rays */}
      <g
        mask={`url(#rayMask-${uid})`}
        style={{
          transformOrigin: `${CENTER}px ${CENTER}px`,
          transform:
            mode === "light"
              ? "rotate(0deg) scale(1)"
              : "rotate(45deg) scale(0.55)",
          opacity: mode === "light" ? 1 : 0,
          transition:
            "opacity .18s ease-out, transform .5s cubic-bezier(.4,1.7,.6,1)",
        }}
      >
        {Array.from({ length: RAY_COUNT }).map((_, i) => (
          <rect
            key={i}
            x={CENTER - RAY_WID / 2}
            y={CENTER - CORE_RADIUS - RAY_GAP - RAY_LEN}
            width={RAY_WID}
            height={RAY_LEN}
            rx={1}
            fill="currentColor"
            transform={`rotate(${(360 / RAY_COUNT) * i} ${CENTER} ${CENTER})`}
          />
        ))}
      </g>
      {/* core disc ⇄ ring */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={CORE_RADIUS}
        fill="currentColor"
        style={{
          opacity: mode === "light" ? 1 : 0,
          transition: "opacity .22s linear",
          filter:
            mode === "light"
              ? "drop-shadow(0 0 6px rgba(255,255,255,.5))"
              : "none",
        }}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={CORE_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{
          opacity: mode === "light" ? 0 : 1,
          transition: "opacity .22s linear",
        }}
      />
    </svg>
  );

  /* ─── render ─── */
  if (inline) {
    /* just the icon – parent handles the click */
    return SunMoonSVG;
  }

  /* floating button version */
  return (
    <div style={{ position: "absolute", top: 20, right: 20, zIndex: 100 }}>
      <button
        onClick={handleClick}
        aria-label="Toggle theme"
        style={{
          width: VIEWBOX,
          height: VIEWBOX,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textColor,
        }}
      >
        {SunMoonSVG}
      </button>
    </div>
  );
};

export default ThemeToggleControl;
