
// src/components/Overlay.tsx
import React, { useEffect, useRef } from "react";
import { neonBtn } from "../utils/styles";
import SoundManager from "../utils/SoundManager";


export type OverlayProps = {
  flash: boolean;
  editMode: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  updating: boolean;
  titleChanged: boolean;
  onUpdate: () => void;
  onDelete: () => void;
  onDismiss: () => void;
  emulatorFound: boolean;
  romFound: boolean;
  onPlay: () => void;
};

const Overlay: React.FC<OverlayProps> = (p) => {
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#181b20",
    borderRadius: 28,
    padding: "14px 28px",
    boxShadow: "0 10px 30px rgba(0,0,0,.6)",
    zIndex: 999,
    animation: p.flash ? "flashOk .6s ease" : "bubbleFade .25s ease forwards",
  };

  const inner: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
  };

  const editInput: React.CSSProperties = {
    background: "#1e1e24",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "10px 14px",
    minWidth: 200,
    fontSize: 15,
    outline: "none",
    boxShadow: "inset 0 0 0 1px #333",
  };

  const titleCss: React.CSSProperties = { fontSize: 18, fontWeight: 500, color: "#fff" };
  const xBtn: React.CSSProperties = {
    background: "#ff3737",
    border: "none",
    borderRadius: "50%",
    width: 34,
    height: 34,
    cursor: "pointer",
    color: "#fff",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 10px rgba(255,55,55,.5)",
  };


  const statusRow: React.CSSProperties = { display: "flex", gap: 20 };
  const dot = (ok: boolean): React.CSSProperties => ({
    width: 14,
    height: 14,
    borderRadius: 7,
    background: ok ? "#29ff9a" : "#ff5555",
    boxShadow: ok
      ? "0 0 6px rgba(41,255,154,.8)"
      : "0 0 6px rgba(255,85,85,.8)",
    marginRight: 8,
  });
  const tooltip: React.CSSProperties = {
    position: "absolute",
    bottom: "110%",
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontSize: 13,
    background: "#1e2128",
    padding: "6px 10px",
    borderRadius: 8,
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity .15s",
  };
  const badgeWrap: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    cursor: "default",
  };

  return (
    <div
      style={overlayStyle}
      onClick={() => {
        SoundManager.playUIBack();
        p.onDismiss();
      }}
    >
      <div style={inner} onClick={(e) => e.stopPropagation()}>

        {!p.editMode && (
          <>
            <span style={titleCss}>{p.editTitle}</span>


            <div style={statusRow}>
              <div style={badgeWrap} className="hover-tip">
                <div style={dot(p.emulatorFound)} />
                <span style={tooltip}>
                  Emulator {p.emulatorFound ? "found" : "missing"}
                </span>
              </div>
              <div style={badgeWrap} className="hover-tip">
                <div style={dot(p.romFound)} />
                <span style={tooltip}>
                  ROM {p.romFound ? "found" : "missing"}
                </span>
              </div>
            </div>
          </>
        )}


        {p.editMode && (
          <>
            <input
              value={p.editTitle}
              onChange={(e) => p.setEditTitle(e.target.value)}
              style={editInput}
              placeholder="Edit title…"
            />
            <button
              style={neonBtn(p.updating || !p.titleChanged)}
              disabled={p.updating || !p.titleChanged}
              onClick={() => {
                SoundManager.playUISelect();
                p.onUpdate();
              }}
            >
              {p.updating ? "…" : "Update"}
            </button>
            <button
              style={xBtn}
              title="Delete"
              onClick={() => {
                SoundManager.playUIBack();
                p.onDelete();
              }}
            >
              ✖
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export interface GameInfoOverlayProps {
  title: string;
  emulatorFound: boolean;
  romFound: boolean;
  onPlay: () => void;

  onDismiss: () => void;
}


export const GameInfoOverlay: React.FC<GameInfoOverlayProps> = ({
  title,
  emulatorFound,
  romFound,
  onPlay,
  onDismiss,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        SoundManager.playUIBack();
        onDismiss();
      }
    };
    window.addEventListener("mousedown", handle);
    return () => {
      window.removeEventListener("mousedown", handle);
    };
  }, [onDismiss]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse { 0%{transform:scale(1)}
                         50%{transform:scale(1.08)}
                        100%{transform:scale(1)} }
      .hover-tip:hover span { opacity:1 }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []); 

  const panel: React.CSSProperties = {
    position: "fixed",
    bottom: 28,
    left: "75%",
    transform: "translateX(-50%)",
    padding: "14px 28px",
    borderRadius: 28,
    background: "#181b20",
    boxShadow: "0 10px 30px rgba(0,0,0,.6)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    animation: "bubbleFade .25s ease forwards",
    zIndex: 999,
    maxWidth: "92vw",
  };

  const titleCss: React.CSSProperties = { fontSize: 22, fontWeight: 500, textAlign: "center" };
  const statusRow: React.CSSProperties = { display: "flex", gap: 20 };

  const dot = (ok: boolean): React.CSSProperties => ({
    width: 14,
    height: 14,
    borderRadius: 7,
    background: ok ? "#29ff9a" : "#ff5555",
    boxShadow: ok
      ? "0 0 6px rgba(41,255,154,.8)"
      : "0 0 6px rgba(255,85,85,.8)",
    marginRight: 8,
  });

  const tooltip2: React.CSSProperties = {
    position: "absolute",
    bottom: "110%",
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontSize: 13,
    background: "#1e2128",
    padding: "6px 10px",
    borderRadius: 8,
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity .15s",
  };

  const badgeWrap2: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    cursor: "default",
  };

  return (
    <div style={panel} ref={panelRef}>
      <div style={titleCss}>{title}</div>

      {/* status dots */}
      <div style={statusRow}>
        <div style={badgeWrap2} className="hover-tip">
          <div style={dot(emulatorFound)} />
          <span style={tooltip2}>
            Emulator {emulatorFound ? "found" : "missing"}
          </span>
        </div>
        <div style={badgeWrap2} className="hover-tip">
          <div style={dot(romFound)} />
          <span style={tooltip2}>ROM {romFound ? "found" : "missing"}</span>
        </div>
      </div>

      <button
        style={{
          ...neonBtn(!emulatorFound || !romFound),
          cursor: emulatorFound && romFound ? "pointer" : "not-allowed",
          animation: "pulse .3s ease",
        }}
        disabled={!emulatorFound || !romFound}
        onClick={(e) => {
          SoundManager.playUISelect();
          onPlay();
          (e.currentTarget as HTMLButtonElement).animate(
            [
              { transform: "scale(1)" },
              { transform: "scale(1.08)" },
              { transform: "scale(1)" },
            ],
            { duration: 220, easing: "ease-out" }
          );
        }}
      >
        Launch
      </button>
    </div>
  );
};

export default Overlay;
