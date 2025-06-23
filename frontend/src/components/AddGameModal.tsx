// src/components/AddGameModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { neonBtn } from "../utils/styles";
import { useTheme } from "../theme/ThemeContext";
import SoundManager from "../utils/SoundManager";
import { getStyles } from '../styles/GameManager.styles';

export interface AddGameModalProps {
  mode: "add" | "edit";
  /** `coverUrl` supplies an existing image when editing */
  initial?: Partial<GameForm> & { coverUrl?: string };
  onSubmit: (data: GameForm) => void;
  onDismiss: () => void;
  onDelete?: () => void;
}

export interface GameForm {
  title: string;
  coverFile: File | null;
  romPath: string;
  emuPath: string;
}

const AddGameModal: React.FC<AddGameModalProps> = ({
  mode,
  initial = {},
  onSubmit,
  onDismiss,
  onDelete,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [form, setForm] = useState<GameForm>({
    title: initial.title ?? "",
    coverFile: initial.coverFile ?? null,
    romPath: initial.romPath ?? "",
    emuPath: initial.emuPath ?? "",
  });

  const [preview, setPreview] = useState<string | null>(
    initial.coverFile
      ? URL.createObjectURL(initial.coverFile)
      : initial.coverUrl || null,
  );
  useEffect(() => {
    if (!form.coverFile && initial.coverUrl) {
      setPreview(initial.coverUrl);
    }
  }, [initial.coverUrl]);

  const [romName, setRomName] = useState<string>(
    initial.romPath ? initial.romPath.split(/[/\\]/).pop()! : ""
  );
  const [emuName, setEmuName] = useState<string>(
    initial.emuPath ? initial.emuPath.split(/[/\\]/).pop()! : ""
  );

  const coverRef = useRef<HTMLInputElement>(null);
  const romRef = useRef<HTMLInputElement>(null);
  const emuRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = `
      @keyframes modalIn {
        0% { 
          opacity: 0; 
          transform: translate(-50%, -60%); 
        }
        100% { 
          opacity: 1; 
          transform: translate(-50%, -50%); 
        }
      }
    `;
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
    };
  }, []);

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backdropFilter: "blur(6px)",
    background: theme.mode === 'light' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,.4)',
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
  };

  // --- Modern modal style helpers ---
  const modernPanel: React.CSSProperties = {
    ...styles.form,
    animation: "modalIn .25s ease",
    display: "flex",
    flexDirection: "column",
    gap: 28,
    color: theme.text,
    background: `linear-gradient(180deg, ${theme.panelTop} 0%, ${theme.panelBot} 100%)`,
    boxShadow: theme.shadow + ', 0 8px 32px 0 rgba(0,0,0,0.18)',
    border: `1.5px solid ${theme.mode === 'light' ? '#e0e0e0' : '#23242a'}`,
    borderRadius: 48, // match header/commandbar
    padding: '40px 40px 32px 40px',
    minWidth: 340,
    maxWidth: 440,
    width: '100%',
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  };
  const sectionHeader: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    color: theme.text,
    letterSpacing: 0.5,
    textAlign: 'left',
    alignSelf: 'flex-start',
  };
  const modernInput: React.CSSProperties = {
    ...styles.input,
    fontSize: 17,
    padding: '14px 18px',
    borderRadius: 16,
    border: `1.5px solid ${theme.mode === 'light' ? '#e0e0e0' : '#23242a'}`,
    background: theme.mode === 'light' ? '#f7f7fa' : '#23242a',
    transition: 'border 0.2s',
    marginBottom: 2,
    width: '100%',
    boxSizing: 'border-box',
  };
  const fileDirHint: React.CSSProperties = {
    fontSize: 12,
    color: theme.mode === 'light' ? '#888' : '#aaa',
    marginLeft: 10,
    fontStyle: 'italic',
  };
  // 3DS cover aspect ratio: 5:7 (front: 120x168mm)
  const coverPreview: React.CSSProperties = {
    marginTop: 12,
    height: 154,
    width: 110,
    objectFit: 'cover',
    aspectRatio: '110/154',
    borderRadius: 12,
    border: `2px solid ${theme.mode === 'light' ? '#e0e0e0' : '#23242a'}`,
    boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
    background: theme.mode === 'light' ? '#fff' : '#18181c',
    alignSelf: 'center',
    display: 'block',
  };
  // 3DS-like button style
  const modalBtn: React.CSSProperties = {
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 16,
    minWidth: 110,
    padding: '12px 0',
    borderRadius: 18,
    background: `linear-gradient(180deg, ${theme.panelTop} 0%, ${theme.panelBot} 100%)`,
    color: theme.text,
    border: `2.5px solid ${theme.mode === 'light' ? '#e0e0e0' : '#23242a'}`,
    boxShadow: '0 2px 0 0 #bdbdbd, 0 4px 12px 0 rgba(0,0,0,0.10)',
    outline: 'none',
    cursor: 'pointer',
    margin: 0,
    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
    position: 'relative',
    userSelect: 'none',
  };
  const modalBtnDisabled: React.CSSProperties = {
    ...modalBtn,
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  };
  const actionRow: React.CSSProperties = {
    display: 'flex',
    gap: 18,
    justifyContent: 'center',
    marginTop: 24,
    width: '100%',
  };
  // X close button
  const closeBtn: React.CSSProperties = {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 36,
    height: 36,
    border: 'none',
    background: 'transparent',
    color: theme.text,
    fontSize: 28,
    fontWeight: 900,
    cursor: 'pointer',
    zIndex: 10,
    borderRadius: 24,
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // --- Directory persistence helpers ---
  function getDirFromPath(path: string) {
    if (!path) return '';
    const parts = path.split(/[/\\]/);
    parts.pop();
    return parts.join('/') || '';
  }
  function saveLastDir(key: string, filePath: string) {
    const dir = getDirFromPath(filePath);
    if (dir) localStorage.setItem(key, dir);
  }
  function getLastDir(key: string): string | null {
    return localStorage.getItem(key);
  }

  // --- Patch file pickers to remember last-used directories ---
  // Note: Standard <input type="file"> does not support setting directory, but Electron can via webkitdirectory or showOpenDialog.
  // We'll save the last-used dir for each type, and show it in the UI for user reference.

  return (
    <div style={overlay}>
      <div style={modernPanel} onClick={e => e.stopPropagation()}>
        <button
          style={closeBtn}
          aria-label="Close"
          onClick={() => {
            SoundManager.playUIBack();
            onDismiss();
          }}
        >
          ×
        </button>
        <h2 style={{ margin: 0, ...sectionHeader, textAlign: 'center', alignSelf: 'center', marginBottom: 18 }}>
          {mode === "add" ? "Add Game" : "Edit Game"}
        </h2>
        {/* Clear layout control row */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          {/* Add layout controls here if needed, e.g. for future expansion */}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
          <div style={sectionHeader}>Cover Art</div>
          <button
            style={modalBtn}
            onClick={() => {
              SoundManager.playUISelect();
              coverRef.current?.click();
            }}
          >
            {form.coverFile ? "Change Cover" : "Select Cover"}
            {getLastDir('coverDir') && (
              <span style={fileDirHint}>
                {getLastDir('coverDir')}
              </span>
            )}
          </button>
          <input
            type="file"
            ref={coverRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setForm((prev) => ({ ...prev, coverFile: f }));
              if (f) {
                setPreview(URL.createObjectURL(f));
                saveLastDir('coverDir', (f as any).path || '');
              } else setPreview(null);
            }}
          />
          {preview && (
            <img
              src={preview}
              alt="Cover preview"
              style={coverPreview}
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%' }}>
          <div style={sectionHeader}>Title</div>
          <input
            style={modernInput}
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter game title"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%' }}>
          <div style={sectionHeader}>ROM Path</div>
          <button
            style={modalBtn}
            onClick={() => {
              SoundManager.playUISelect();
              romRef.current?.click();
            }}
          >
            {romName ? "Change ROM" : "Select ROM"}
            {getLastDir('romDir') && (
              <span style={fileDirHint}>
                {getLastDir('romDir')}
              </span>
            )}
          </button>
          <input
            type="file"
            ref={romRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const filePath = (f as any).path || "";
                setForm((prev) => ({ ...prev, romPath: filePath }));
                setRomName(f.name);
                saveLastDir('romDir', filePath);
              }
            }}
          />
          {romName && (
            <div style={{ fontSize: 14, color: theme.text, textAlign: "left", marginTop: 2 }}>{romName}</div>
          )}
          {form.romPath && (
            <div style={{ fontSize: 12, color: theme.mode === 'light' ? '#888' : '#aaa', marginTop: 2, textAlign: "left", wordBreak: "break-all" }}>{form.romPath}</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: '100%' }}>
          <div style={sectionHeader}>Emulator Path</div>
          <button
            style={modalBtn}
            onClick={() => {
              SoundManager.playUISelect();
              emuRef.current?.click();
            }}
          >
            {emuName ? "Change Emulator" : "Select Emulator"}
            {getLastDir('emuDir') && (
              <span style={fileDirHint}>
                {getLastDir('emuDir')}
              </span>
            )}
          </button>
          <input
            type="file"
            ref={emuRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const filePath = (f as any).path || "";
                setForm((prev) => ({ ...prev, emuPath: filePath }));
                setEmuName(f.name);
                saveLastDir('emuDir', filePath);
              }
            }}
          />
          {emuName && (
            <div style={{ fontSize: 14, color: theme.text, textAlign: "left", marginTop: 2 }}>{emuName}</div>
          )}
          {form.emuPath && (
            <div style={{ fontSize: 12, color: theme.mode === 'light' ? '#888' : '#aaa', marginTop: 2, textAlign: "left", wordBreak: "break-all" }}>{form.emuPath}</div>
          )}
        </div>

        <div style={actionRow}>
          {mode === "edit" && onDelete && (
            <button
              style={modalBtn}
              onClick={() => {
                SoundManager.playUIBack();
                onDelete();
              }}
            >
              Delete
            </button>
          )}
          <button
            style={modalBtn}
            onClick={() => {
              SoundManager.playUIBack();
              onDismiss();
            }}
          >
            Save & Close
          </button>
          <button
            style={
              !form.title ||
              (mode === "add" && !form.coverFile) ||
              !form.romPath ||
              !form.emuPath
                ? modalBtnDisabled
                : modalBtn
            }
            disabled={
              !form.title ||
              (mode === "add" && !form.coverFile) ||
              !form.romPath ||
              !form.emuPath
            }
            onClick={() => {
              SoundManager.playUISelect();
              onSubmit(form);
            }}
          >
            {mode === "add" ? "Add" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGameModal;
