import React, { useState, useId } from "react";

export interface ThemeToggleControlProps {
  /** Notified after each click */
  onThemeChange?: (theme: "light" | "dark") => void;
}

/**
 * Click → light ⇄ dark
 * Shows an animated sun / moon icon.
 */
const ThemeToggleControl: React.FC<ThemeToggleControlProps> = ({
  onThemeChange,
}) => {
  /* ───────── state ───────── */
  const [theme, setTheme] = useState<"light" | "dark">("light");

  /* ───────── click handler ───────── */
  const handleClick = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    onThemeChange?.(next);
  };

  /* ───────── SVG constants ───────── */
  const uid          = useId();
  const VIEWBOX      = 40;
  const CENTER       = VIEWBOX / 2;
  const CORE_RADIUS  = 8;
  const RAY_COUNT    = 8;
  const RAY_LEN      = 5;
  const RAY_WID      = 3;
  const RAY_GAP      = 2;
  const MASK_RADIUS  = CORE_RADIUS + 1;

  /* ───────── UI ───────── */
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 100,
      }}
    >
      <button
        onClick={handleClick}
        aria-label="Toggle theme"
        style={{
          width: 40,
          height: 40,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <svg
          width={VIEWBOX}
          height={VIEWBOX}
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        >
          {/* mask so rays never peek inside the core */}
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
                theme === "light"
                  ? "rotate(0deg) scale(1)"
                  : "rotate(45deg) scale(0.55)",
              opacity: theme === "light" ? 1 : 0,
              transition:
                "opacity 0.18s ease-out, transform 0.5s cubic-bezier(.4,1.7,.6,1)",
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

          {/* core: filled disc ⇄ hollow ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CORE_RADIUS}
            fill="currentColor"
            style={{
              opacity: theme === "light" ? 1 : 0,
              transition: "opacity 0.22s linear",
              filter:
                theme === "light"
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
              opacity: theme === "light" ? 0 : 1,
              transition: "opacity 0.22s linear",
            }}
          />
        </svg>
      </button>
    </div>
  );
};

export default ThemeToggleControl;
