// src/components/CommandBar.tsx
import React, { useEffect } from "react";
import SoundManager from "../utils/SoundManager";

/* ──────────── exported props ──────────── */
export interface CommandBarProps {
  onLaunch: () => void;
  onEdit: () => void;
  canLaunch?: boolean;
  editEnabled?: boolean;
}

/* ──────────── design tokens ──────────── */
const tokens = {
  top: "#3b404d",
  bot: "#1d1f26",
  gloss: "linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%)",
  depth:
    `0 .05em .05em -.01em rgba(5,5,5,1),
     0 .01em .01em -.01em rgba(5,5,5,.5),
     .2em .4em .15em -.03em rgba(5,5,5,.25)`,
  focus: "#00e4ff",
  dividerHi: "rgba(255,255,255,.17)",
  dividerLo: "rgba(0,0,0,.60)",
  txtGlow: "0 0 4px rgba(0,160,255,.65)",
  /* brighter seam */
  dividerGlow: "0 0 6px rgba(255,255,255,.40)",
  /* new */
  segIdleLight: .06,          // default highlight on the left half
  barH: 72,          // px – overall height
  radius: 48,        // px – matches height*0.66 for chunky ends
  fontSize: 24,      // px – big label
};

const CommandBar: React.FC<CommandBarProps> = ({
  onLaunch,
  onEdit,
  canLaunch = true,
  editEnabled = true,
}) => {
  /* inject CSS once on mount */
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
/* ───── BAR SHELL ─────────────────────────────────────────── */
.command-bar{
  position:fixed; left:0; right:0; bottom:0;           /* flush bottom */
  height:${tokens.barH}px; display:flex; overflow:hidden;
  border-radius:${tokens.radius}px;
  background:
    ${tokens.gloss},
    linear-gradient(180deg,${tokens.top} 0%,${tokens.bot} 100%);
  background-blend-mode:soft-light;
  box-shadow:${tokens.depth};
  z-index:3000; pointer-events:auto;
  }

/* thin bottom rim highlight – makes the bar pop */
.command-bar::after{
  content:"";
  position:absolute; left:0; right:0; bottom:0;
  height:2px;
  background:rgba(255,255,255,.12);
  mix-blend-mode:soft-light;
  pointer-events:none;
}
/* inner raised rim */
.command-bar::before{
  content:""; position:absolute; inset:0; border-radius:inherit;
  box-shadow:
    inset 0 0 0 0 rgba(5,5,5,.10),
    inset -.06em -.06em .06em 0 rgba(5,5,5,.25),
    inset 0 0 0 0 rgba(5,5,5,.10),
    inset 0 0 .06em .24em rgba(255,255,255,.25),
    inset .03em .06em .12em 0 rgba(255,255,255,1),
    inset .14em .14em .14em rgba(255,255,255,.25),
    inset -.09em -.3em .3em .12em rgba(5,5,5,.25);
  mix-blend-mode:soft-light;
  pointer-events:none;
}

/* ───── SEGMENTS (Launch | Edit) ──────────────────────────── */
.command-bar .seg{
  flex:1; position:relative; border:none; background:transparent;
  font:700 ${tokens.fontSize}px/1 "Inter",sans-serif;
  color:#fff; text-transform:uppercase; letter-spacing:.5px;
  text-shadow:${tokens.txtGlow},0 1px 1px rgba(0,0,0,.8);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; user-select:none;
  transition:filter .12s, transform .12s;
}
/* each half gets its own overlay for hover/press */
.command-bar .seg::before{
  content:""; position:absolute; inset:0; border-radius:inherit;
  background:rgba(255,255,255,.08); opacity:0;
  transition:opacity .12s;
}
/* give each half a slightly different base-tone */
.command-bar .launch::before{ opacity:${tokens.segIdleLight}; }
.command-bar .edit::before { opacity:0; }
/* hover brighten */
.command-bar .seg:hover::before{ opacity:.35; }
/* active push + darken */
.command-bar .seg:active{
  transform:translateY(.07em);
}
.command-bar .seg:active::before{
  background:rgba(0,0,0,.25); opacity:.45;
}

/* centre divider ridge */
.command-bar .seg:first-child::after{
  content:""; position:absolute; right:0; top:6px; bottom:6px; width:2px;
  background:linear-gradient(180deg,
             ${tokens.dividerHi} 0 25%,
             ${tokens.dividerLo} 25% 75%,
             ${tokens.dividerHi} 75% 100%);
  box-shadow:${tokens.dividerGlow};
}

/* focus ring */
.command-bar .seg:focus-visible{
  outline:3px solid ${tokens.focus}; outline-offset:-3px;
}

/* disabled */
.command-bar .seg:disabled{
  opacity:.35; cursor:default; filter:none;
}
.command-bar .seg:disabled:hover::before{ opacity:0; }
`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  /* play click sound */
  const blip = () => SoundManager.playPan();

  return (
    <div className="command-bar" data-ui>
      {/* LAUNCH – left half */}
      <button
        className="seg launch"
        disabled={!canLaunch}
        onPointerUp={() => { if (canLaunch) { blip(); onLaunch(); } }}
      >
        Launch
      </button>

      {/* EDIT – right half */}
      <button
        className="seg edit"
        disabled={!editEnabled}
        onPointerUp={() => { if (editEnabled) { blip(); onEdit(); } }}
      >
        Edit
      </button>
    </div>
  );
};

export default CommandBar;
