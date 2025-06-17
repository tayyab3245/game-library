// src/GameManager.tsx

import React, { useState, useEffect, useLayoutEffect } from "react";
import "./theme.css";                 /* ← import the CSS variables */
import GameShelf from "./components/GameShelf";
import ThemeToggleControl from "./components/ThemeToggleControl";
import { ADD_MARKER } from "./components/GameShelf/constants";
import AddGameModal, { GameForm } from "./components/AddGameModal";
import { styles } from "./styles/GameManager.styles";
import { neonBtn } from "./utils/styles";
import useGames, { Game } from "./hooks/useGames";
import SoundManager from "./utils/SoundManager";
import CommandBar from "./components/CommandBar";
import GridIcon from './components/GridIcon';



export default function GameManager() {
  const { games, loadGames, API } = useGames();

  const [selIdx, setSelIdx]   = useState<number | null>(null);
  const [rowMode, setRowMode] = useState<1 | 2 | 4>(1);     // allow 4 rows
  const [editTitle, setEditTitle] = useState("");
  const [updating, setUpdating] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [editMode, _setEditMode] = useState(false);      // kept only for modal mode flag

  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalOpen, setModalOpen] = useState(false);

  // include coverUrl in initial data for the modal
  const [initialData, setInitialData] = useState<Partial<GameForm> & { coverUrl?: string }>({});

  const [romExists, setRomExists] = useState(false);
  const [emuExists, setEmuExists] = useState(false);

    // current time for header clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const selGame: Game | null = selIdx === null ? null : games[selIdx] || null;
  useEffect(() => {
    if (selIdx !== null) {
      const g = games[selIdx];
      if (g) {
        setEditTitle(g.title);
      }
    }
  }, [selIdx, games]);

  useEffect(() => {
    if (!selGame) {
      setRomExists(false);
      setEmuExists(false);
      return;
    }

    const api = (window as any).launcherAPI;
    if (!api || typeof api.exists !== "function") {
      console.warn("launcherAPI.exists is not available in this environment.");
      setRomExists(false);
      setEmuExists(false);
      return;
    }

    Promise.all([api.exists(selGame.romPath), api.exists(selGame.emuPath)])
      .then(([romOk, emuOk]) => {
        setRomExists(romOk);
        setEmuExists(emuOk);
      })
      .catch((err: any) => {
        console.error("exists check failed:", err);
        setRomExists(false);
        setEmuExists(false);
      });
  }, [selGame?.romPath, selGame?.emuPath]);

  const refreshAndClear = () => {
    setSelIdx(null);
    _setEditMode(false);
    setEditTitle('');
    loadGames();
  };

  const createOrUpdateGame = async (formData: GameForm) => {
    try {
      const payload = new FormData();
      payload.append("platform", "3DS");
      payload.append("title", formData.title);
      payload.append("romPath", formData.romPath);
      payload.append("emuPath", formData.emuPath);
      if (formData.coverFile) {
        payload.append("cover", formData.coverFile);
      }

      let res: Response;
      if (modalMode === "add") {
        res = await fetch(`${API}/api`, { method: "POST", body: payload });
      } else {
        if (selIdx === null) throw new Error("No game selected to edit");
        const id = games[selIdx].id;
        res = await fetch(`${API}/api/${id}`, {
          method: "PUT",
          body: payload,
        });
      }

      if (!res.ok) {
        const errInfo = await res.json();
        throw new Error(errInfo.error || "Failed to save");
      }
      setModalOpen(false);
      refreshAndClear();
    } catch (e: any) {
      window.alert(`Error: ${e.message}`);
    }
  };

  const deleteGame = (id: number) =>
    fetch(`${API}/api/${id}`, { method: "DELETE" })
      .then(refreshAndClear)
      .catch((e) => window.alert(`Error: ${e.message}`));

  const replaceCollection = () =>
    fetch(`${API}/api`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(games),
    })
      .then(loadGames)
      .catch((e) => window.alert(`Error: ${e.message}`));

  const deleteAllGames = () =>
    fetch(`${API}/api`, { method: "DELETE" })
      .then(refreshAndClear)
      .catch((e) => window.alert(`Error: ${e.message}`));

  const handleSelectFromShelf = (i: number | null) => {
    if (i === null) {
      setSelIdx(null);
      return;
    }
    // plus-cube selected → open “add game” modal
    if (i === -1) {
      SoundManager.playUISelect();
      openAddModal();
      return;
    }
    setSelIdx(i);
    SoundManager.playObjectSelect();
  };

  const handleLongPressFromShelf = (i: number) => {
    setSelIdx(i);
    SoundManager.playUISelect();
  };

  const SHELF_H = Math.min(720, vw * 0.9);
  const titleChanged = editTitle.trim() !== (selGame?.title.trim() ?? "").trim();
  const canLaunch   = !!selGame && romExists && emuExists;
  /* ───────── inject 3DS-style capsule CSS once ───────── */
useLayoutEffect(()=>{
  const s=document.createElement('style');s.innerHTML=`
.view-toggle {
  position: absolute;
  left: 0;
  top: 0;
  height: 48px;
  transform: scale(1.5);
  transform-origin: top left;
  display: flex;
  border-radius: 0 0 24px 0;
  overflow: hidden;
  background:
    linear-gradient(-35deg, rgba(255,255,255,0.07) 0%, transparent 60%),
    linear-gradient(180deg, #3b404d 0%, #1a1c22 100%);
  box-shadow:
    inset 0 2px 3px rgba(255,255,255,0.08),
    inset 0 -1px 2px rgba(0,0,0,0.4),
    0 4px 8px rgba(0,0,0,0.3);
  padding-left: 8px;
  padding-right: 8px;
}

.view-toggle .seg {
  flex: 1 1 0;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  font: 700 28px/1 "Inter", sans-serif; /* Increase font size */
  z-index: 1;
  border-radius: 0;
  padding: 12px; /* Add padding for larger buttons */
}

.view-toggle .seg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,.08);
  opacity: 0.06;
  transition: opacity 0.12s;
  border-radius: 12px;
}

.view-toggle .seg:hover::before {
  opacity: 0.35;
}

.view-toggle .seg.active {
  background: linear-gradient(
    to bottom,
    #f0f0f0 0%,
    #e8e8e8 10%,
    #dcdcdc 50%,
    #c2c2c2 90%,
    #b2b2b2 100%
  );
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.6),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.4);
  color: #111;
  z-index: 2;
  flex-grow: 2;
  height: 100%;
  padding: 0 18px; /* Adjust padding for active buttons */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 24px 24px;
  transition: all 0.25s ease;
}

  `;
  document.head.appendChild(s);return()=>{document.head.removeChild(s);}
},[]);

 
  
  /* helpers */
  const openAddModal = () => {
    setModalMode("add");
    // `coverUrl` is optional, so use undefined instead of `null`
    setInitialData({ coverUrl: undefined });
    setModalOpen(true);
  };
  const openEditForSelected = () => {
    if (selIdx === null) return;
    setModalMode("edit");
    setInitialData({
      title: selGame!.title,
      coverUrl: `${API}${selGame!.imageUrl}`,
      coverFile: null,
      romPath: selGame!.romPath,
      emuPath: selGame!.emuPath,
    });
    setModalOpen(true);
  };
    const handleLaunch = () => {
    if (!canLaunch) return;
    const api = (window as any).launcherAPI;
    Promise.all([api.exists(selGame!.romPath), api.exists(selGame!.emuPath)]).then(
      ([romOk, emuOk]) => {
        if (!romOk || !emuOk) {
          window.alert("ROM or Emulator missing");
          return null;
        }
        return api.play(selGame!.emuPath, selGame!.romPath);
      },
    );
  };

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <div
      data-theme={theme}                       /* <- switch vars via data-theme */
      style={{ ...styles.container, position: "relative" }}
    >
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          <h2 style={styles.gameTitle}>{selGame?.title ?? 'Select a game'}</h2>
          {selGame && (
            <div style={styles.hours}>
              {selGame.hoursPlayed} hour{selGame.hoursPlayed === 1 ? '' : 's'} played
            </div>
          )}
        </div>
        <span style={styles.dateTime}>{now.toLocaleString()}</span>
        {/* ───── View-toggle capsule ───── */}
        <div className="view-toggle" data-ui>
          {[1, 2, 4].map((r) => (
            <button
              key={r}
              className={`seg ${rowMode === r ? 'active' : ''}`}
              title={`${r === 1 ? 'Single' : r === 2 ? 'Double' : 'Quad'} row`}
              onPointerUp={() => {
                setRowMode(r as 1 | 2 | 4);
                SoundManager.playUISelect();
              }}
            >
              <GridIcon
                mode={r as 1 | 2 | 4}
                filled={rowMode === r}
                size={24}
              />
            </button>
          ))}
        </div>
      </div>
        <div style={{ ...styles.middle, height: SHELF_H }}>
        <GameShelf
          textures={[...games.map((g) => `${API}${g.imageUrl}`), ADD_MARKER]}
          width="100%"
          height="100%"
          rows={rowMode}
          onSelect={handleSelectFromShelf}
          onLongPress={handleLongPressFromShelf}
        />
      </div>

      {modalOpen && (
        <AddGameModal
          mode={modalMode}
          initial={initialData}
            onDelete={() => {
            if (selIdx !== null) {
              SoundManager.playUIBack();
              deleteGame(games[selIdx].id);
              setModalOpen(false);
            }
          }}

          onSubmit={(data) => {
            SoundManager.playUISelect();
            createOrUpdateGame(data);
          }}
          onDismiss={() => {
            SoundManager.playUIBack();
            setModalOpen(false);
          }}
        />
      )}
            {/* ────────── Bottom Command Bar ────────── */}
      <CommandBar
        canLaunch={canLaunch}
        editEnabled={selIdx !== null}
        onLaunch={() => {
          SoundManager.playUISelect();
          handleLaunch();
        }}
        onEdit={() => {
          SoundManager.playUISelect();
          openEditForSelected();
        }}
      />
      <ThemeToggleControl onThemeChange={setTheme}/>
    </div>
  );
}
