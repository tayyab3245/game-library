// NEW – src/components/VolumeButton.tsx
import React, { useEffect } from "react";
import SoundManager from "../utils/SoundManager";
import { useTheme } from "../theme/ThemeContext";

export type VolumeLevel = 0 | 1 | 2 | 3; // 0 = mute … 3 = high

interface Props {
  level: VolumeLevel;
  onChange: (next: VolumeLevel) => void;
}

/** Cycles mute → low → mid → high and mirrors it in SoundManager. */
export default function VolumeButton({ level, onChange }: Props) {
  const theme = useTheme();

  const cycle = () => {
    const next = ((level + 1) % 4) as VolumeLevel;
    SoundManager.setMuted(next === 0);
    SoundManager.setGlobalVolume([0, 0.33, 0.66, 1][next]);
    onChange(next);
  };

  useEffect(() => {
    document.querySelectorAll('style[data-owner="volume-btn-style"]').forEach((n) => n.remove());
    const s = document.createElement('style');
    s.dataset.owner = 'volume-btn-style';
    s.innerHTML = `      .seg {
        position: relative;
        background: transparent;
        border: none;
        padding: 4px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        cursor: pointer;
        overflow: visible;
        outline: none;
      }
      .seg:active {
        transform: translateY(1px);
      }
      .seg::before {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 8px;
        background: rgba(255,255,255,.08);
        opacity: 0;
        transition: opacity 0.12s;
      }
      .seg:hover::before {
        opacity: 0.35;
      }
      .seg svg {
        width: 40px;
        height: 40px;
        position: relative;
        overflow: visible;
      }
    `;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  const title =
    level === 0 ? 'Un-mute'
    : level === 1 ? 'Volume low'
    : level === 2 ? 'Volume mid'
    :               'Volume high';

  return (    <button
      title={title}
      className="seg"
      style={{
        position: 'relative',
        width: '48px',
        height: '48px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px',
        color: 'inherit',
        overflow: 'visible',
        background: 'transparent',
        border: 'none',
        outline: 'none',
      }}
      onPointerUp={cycle}
    >      <svg
        viewBox="-4 -4 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          width: '40px',
          height: '40px',
          position: 'relative',
          overflow: 'visible',
        }}
      >        {/* — rounded speaker body (filled) — */}
        <path
          d="M6 12a1 1 0 0 1 1-1h3.5l4-3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1l-4-3H7a1 1 0 0 1-1-1V12z"
          fill="currentColor" stroke="currentColor" strokeLinejoin="round"
        />
        {/* — sound waves — */}
        {level > 0 && <path d="M17 12.2a3 3 0 0 1 0 5.6" fill="none" />}
        {level > 1 && <path d="M21 10a5.5 5.5 0 0 1 0 10" fill="none" />}
        {level > 2 && <path d="M25 8a8 8 0 0 1 0 14" fill="none" />}
        {/* — mute slash — */}
        {level === 0 && <line x1="17" y1="9" x2="24" y2="21" />}
      </svg>
    </button>
  );
}
