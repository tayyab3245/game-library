// src/components/CommandBar.tsx
import React, { useEffect } from "react";
import SoundManager from "../utils/SoundManager";
import { useTheme } from "../theme/ThemeContext";

/* ──────────── exported props ──────────── */
export interface CommandBarProps {
  onLaunch: () => void;
  onEdit: () => void;
  canLaunch?: boolean;
  editEnabled?: boolean;
}

/* ──────────── design tokens ──────────── */
const tokens = (t: ReturnType<typeof useTheme>) => ({
  // derive a light + dark ramp from the current panel colour
  top: t.panelTop,
  bot: t.panelBot,
  gloss: "linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%)",
  depth:
    `0 .05em .05em -.01em rgba(5,5,5,1),
     0 .01em .01em -.01em rgba(5,5,5,.5),
     .2em .4em .15em -.03em rgba(5,5,5,.25)`,
  focus: "#00e4ff",
  dividerHi: "rgba(255,255,255,.17)",
  dividerLo: "rgba(0,0,0,.60)",
  txtGlow: "0 0 4px rgba(0,160,255,.65)",
  textPressLight: "rgba(0,0,0,0.6)",
  textPressDark:  "rgba(255,255,255,0.2)",
  txt: t.text,                 // <-- NEW
  /* brighter seam */
  dividerGlow: "0 0 6px rgba(255,255,255,.40)",
  /* new */
  segIdleLight: .06,          // default highlight on the left half
  barH: 72,          // px – overall height
  radius: 48,        // px – matches height*0.66 for chunky ends
  fontSize: 24,      // px – big label
  text3d: {
    dark: "rgba(0,0,0,0.6)",
    light: "rgba(255,255,255,0.2)",
    pressed: "rgba(0,0,0,0.8)"
  },
  topLight: "rgba(255,255,255,0.25)",  // Stronger top highlight
  insetShadow: "rgba(0,0,0,0.35)",
  segment: {
    gap: "1px",
    shadow: t.shadow,
    highlight: "rgba(255,255,255,0.12)",
    seam: {
      dark: "rgba(0,0,0,0.5)",
      light: "rgba(255,255,255,0.15)"
    }
  }
});

const CommandBar: React.FC<CommandBarProps> = ({
  onLaunch,
  onEdit,
  canLaunch = true,
  editEnabled = true,
}) => {
  const theme = useTheme();
  const tokensInst = tokens(theme);
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
/* ───── BAR SHELL ─────────────────────────────────────────── */
.command-bar{
  position:fixed; left:0; right:0; bottom:0;           /* flush bottom */
  height:${tokensInst.barH}px; display:flex; overflow:hidden;
  border-radius:${tokensInst.radius}px;
  gap: 0;  /* Remove gap, we'll use pseudo-elements for seam */
  padding: ${tokensInst.segment.gap};  /* Add padding inside bar */
  background: ${tokensInst.bot};  /* Darker background for gap */
  background:
    ${tokensInst.gloss},
    linear-gradient(180deg,${tokensInst.top} 0%,${tokensInst.bot} 100%);
  background-blend-mode:soft-light;
  box-shadow:${tokensInst.depth};
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
    /* Enhanced top light */
    inset 0 1px 2px ${tokensInst.topLight},
    /* Existing shadows with adjustments */
    inset -.06em -.06em .06em 0 rgba(5,5,5,.25),
    inset 0 0 .08em .24em rgba(255,255,255,.25),
    inset .03em .06em .12em 0 rgba(255,255,255,1),
    inset .14em .14em .14em rgba(255,255,255,.25),
    inset -.09em -.3em .3em .12em rgba(5,5,5,.25);
  mix-blend-mode:soft-light;
  pointer-events:none;
}

/* ───── SEGMENTS (Launch | Edit) ──────────────────────────── */
.command-bar .seg{
  position:relative; border:none; background:transparent;
  font:1000 ${tokensInst.fontSize}px/1 "Nunito", sans-serif;
  letter-spacing: .4px;
  /* subtler 3-D emboss that matches header */
  text-shadow:
    0 -1px 0 ${tokensInst.text3d.dark},
    0  1px 1px ${tokensInst.text3d.light};
  color:${tokensInst.txt}; text-transform:uppercase; letter-spacing:.5px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; user-select:none;
  transition:filter .12s, transform .12s;
  border-radius: 0;
  background:
    ${tokensInst.gloss},
    linear-gradient(180deg,${tokensInst.top} 0%,${tokensInst.bot} 100%);
  background-blend-mode: soft-light;
  box-shadow: 
    inset 0 1px 0 ${tokensInst.segment.highlight},
    inset 0 4px 5px -2px ${tokensInst.insetShadow},
    0 1px 2px ${tokensInst.segment.shadow};
}

/* Remove the old divider since we're using gap */
.command-bar .seg.edit::after {
  display: none;
}

/* Adjust flex basis for different widths */
.command-bar .launch {
  flex: 2;  /* Takes 2/3 of the space */
  order: 2; /* Moves to the right */
}

.command-bar .edit {
  flex: 1;  /* Takes 1/3 of the space */
  order: 1; /* Moves to the left */
}

/* each half gets its own overlay for hover/press */
.command-bar .seg::before{
  content:""; position:absolute; inset:0; border-radius:inherit;
  background:rgba(255,255,255,.08); opacity:0;
  transition:opacity .12s;
}
/* give each half a slightly different base-tone */
.command-bar .launch::before{ opacity:${tokensInst.segIdleLight}; }
.command-bar .edit::before { opacity:0; }
/* hover brighten */
.command-bar .seg:hover::before{ opacity:.35; }
/* active push + darken */
.command-bar .seg:active{
  transform:translateY(.07em);
  /* make pressed text dark in light mode, or light in dark mode */
  color: ${tokensInst.txt};
  text-shadow:
    -1px -1px 0 ${
      theme.mode === "light" 
        ? tokensInst.textPressLight 
        : tokensInst.text3d.light
    },
    1px 1px 0  ${
      theme.mode === "light" 
        ? tokensInst.textPressDark 
        : tokensInst.text3d.dark
    };
  background: linear-gradient(180deg,${tokensInst.bot} 0%,${tokensInst.top} 100%);
  box-shadow: 
    inset 0 2px 5px ${tokensInst.insetShadow},
    0 1px 1px rgba(255,255,255,0.1);
}
.command-bar .seg:active::before{
  background:rgba(0,0,0,.25); opacity:.45;
}

/* focus ring */
.command-bar .seg:focus-visible{
  outline:3px solid ${tokensInst.focus}; outline-offset:-3px;
}

/* disabled */
.command-bar .seg:disabled{
  opacity:.35; cursor:default; filter:none;
}
.command-bar .seg:disabled:hover::before{ opacity:0; }

/* Update the command bar and segment styling */
.command-bar .edit {
  border-top-left-radius: ${Math.floor(tokensInst.radius * 0.8)}px;
  border-bottom-left-radius: ${Math.floor(tokensInst.radius * 0.8)}px;
  border-right: 1px solid ${tokensInst.segment.seam.dark};
}

.command-bar .launch {
  border-top-right-radius: ${Math.floor(tokensInst.radius * 0.8)}px;
  border-bottom-right-radius: ${Math.floor(tokensInst.radius * 0.8)}px;
  border-left: 1px solid ${tokensInst.segment.seam.light};
}
`;
   document.head.appendChild(style);
   return () => { document.head.removeChild(style); };
  }, [theme.mode]);            // <— rebuilt after every toggle

  /* play click sound */
  const blip = () => SoundManager.playPan();

  return (
    <div className="command-bar" data-ui>
      {/* EDIT – left third */}
      <button
        className="seg edit"
        disabled={!editEnabled}
        onPointerUp={() => { if (editEnabled) { blip(); onEdit(); } }}
      >
        Edit
      </button>

      {/* LAUNCH – right two-thirds */}
      <button
        className="seg launch"
        disabled={!canLaunch}
        onPointerUp={() => { if (canLaunch) { blip(); onLaunch(); } }}
      >
        Launch
      </button>
    </div>
  );
};

export default CommandBar;
