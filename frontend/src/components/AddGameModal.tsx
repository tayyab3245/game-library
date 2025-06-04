// src/components/AddGameModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { neonBtn } from "../utils/styles";
import SoundManager from "../utils/SoundManager";

export interface AddGameModalProps {
  mode: "add" | "edit";
  initial?: Partial<GameForm>;
  onSubmit: (data: GameForm) => void;
  onDismiss: () => void;
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
}) => {
  const [form, setForm] = useState<GameForm>({
    title: initial.title ?? "",
    coverFile: initial.coverFile ?? null,
    romPath: initial.romPath ?? "",
    emuPath: initial.emuPath ?? "",
  });

  const [preview, setPreview] = useState<string | null>(
    initial.coverFile ? URL.createObjectURL(initial.coverFile) : null
  );

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
        0% { opacity: 0; transform: translate(-50%, -40px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
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
    background: "rgba(0,0,0,.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
  };
  const panel: React.CSSProperties = {
    background: "rgba(24,28,33,.9)",
    padding: 32,
    borderRadius: 20,
    width: 420,
    maxWidth: "90vw",
    boxShadow: "0 10px 40px rgba(0,0,0,.5)",
    animation: "modalIn .25s ease",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    color: "#fff",
  };
  const label: React.CSSProperties = {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: 500,
    textAlign: "left",
  };
  const input: React.CSSProperties = {
    background: "#1e1e24",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#fff",
    outline: "none",
    fontSize: 15,
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
  };

  return (
    <div
      style={overlay}
      onClick={() => {
        SoundManager.playUIBack();
        onDismiss();
      }}
    >
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, textAlign: "left" }}>
          {mode === "add" ? "Add Game" : "Edit Game"}
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div style={label}>Cover Art</div>
          <button
            style={neonBtn(false)}
            onClick={() => {
              SoundManager.playUISelect();
              coverRef.current?.click();
            }}
          >
            {form.coverFile ? "Change Cover" : "Select Cover"}
          </button>
          <input
            type="file"
            ref={coverRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setForm((prev) => ({ ...prev, coverFile: f }));
              if (f) setPreview(URL.createObjectURL(f));
              else setPreview(null);
            }}
          />
          {preview && (
            <img
              src={preview}
              alt="Cover preview"
              style={{ marginTop: 8, height: 120, borderRadius: 8 }}
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={label}>Title</div>
          <input
            style={input}
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter game title"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={label}>ROM Path</div>
          <button
            style={neonBtn(false)}
            onClick={() => {
              SoundManager.playUISelect();
              romRef.current?.click();
            }}
          >
            {romName ? "Change ROM" : "Select ROM"}
          </button>
          <input
            type="file"
            ref={romRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                // Electron exposes the absolute path via the `path` property
                const filePath = (f as any).path || "";
                setForm((prev) => ({ ...prev, romPath: filePath }));
                setRomName(f.name);
              }
            }}
          />
          {romName && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#ccc",
                textAlign: "left",
              }}
            >
              {romName}
            </div>
          )}
          {form.romPath && (
            <div
              style={{
                fontSize: 12,
                color: "#888",
                marginTop: 2,
                textAlign: "left",
                wordBreak: "break-all",
              }}
            >
              {form.romPath}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={label}>Emulator Path</div>
          <button
            style={neonBtn(false)}
            onClick={() => {
              SoundManager.playUISelect();
              emuRef.current?.click();
            }}
          >
            {emuName ? "Change Emulator" : "Select Emulator"}
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
              }
            }}
          />
          {emuName && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#ccc",
                textAlign: "left",
              }}
            >
              {emuName}
            </div>
          )}
          {form.emuPath && (
            <div
              style={{
                fontSize: 12,
                color: "#888",
                marginTop: 2,
                textAlign: "left",
                wordBreak: "break-all",
              }}
            >
              {form.emuPath}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "flex-end",
            marginTop: 6,
          }}
        >
          <button
            style={neonBtn(true)}
            onClick={() => {
              SoundManager.playUIBack();
              onDismiss();
            }}
          >
            Cancel
          </button>
          <button
            style={neonBtn(
              !form.title ||
                (mode === "add" && !form.coverFile) ||
                !form.romPath ||
                !form.emuPath
            )}
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
