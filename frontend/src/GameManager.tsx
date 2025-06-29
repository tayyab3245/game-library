// src/GameManager.tsx

import React, { useState, useEffect, useLayoutEffect } from "react";
import { ThemeProvider } from "./theme/ThemeContext";
import { getTheme } from "./theme";
import GameShelf from "./components/GameShelf";
import ThemeToggleControl from "./components/ThemeToggleControl";
import { ADD_MARKER } from "./components/GameShelf/constants";
import AddGameModal, { GameForm } from "./components/AddGameModal";
import { getStyles } from "./styles/GameManager.styles";
import useGames, { Game } from "./hooks/useGames";
import SoundManager from "./utils/SoundManager";
import CommandBar from "./components/CommandBar";
import GridIcon from './components/GridIcon';
import VolumeButton from './components/VolumeButton';
type VolumeLevel = 0 | 1 | 2 | 3;



export default function GameManager() {
  const { games, loadGames, API } = useGames();

  /* ── theme must come first so later code (incl. CSS-inject hooks) can see it ── */
  // Set dark theme by default on first load
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    // Try to read from localStorage or system, fallback to dark
    const stored = window.localStorage.getItem('themeMode');
    if (stored === 'light' || stored === 'dark') return stored;
    // Optionally, check prefers-color-scheme here if you want system default
    // if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'dark';
  });
  const theme                     = getTheme(themeMode);

  /* wipe default browser margin that caused a white border */
  useLayoutEffect(() => {
    document.body.style.margin = '0';
    return () => { document.body.style.margin = ''; };
  }, []);


  const [selIdx, setSelIdx]   = useState<number | null>(null);
  const [rowMode, setRowMode] = useState<1 | 2 >(1);     // allow 4 rows
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

  /* ─── master volume (0 – 3) ─── */
  const [volLevel, setVolLevel] = useState<0 | 1 | 2 | 3>(3);
  const handleVolChange = (lvl: 0 | 1 | 2 | 3) => setVolLevel(lvl);

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
  /* pull ready-made ramp colours from the current theme */
  const top = theme.panelTop;
  const bot = theme.panelBot;
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
    linear-gradient(180deg,${top} 0%, ${bot} 100%);
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

/* ───── Volume button ───── */
.volume-btn{
  position:absolute;
  right:64px;               /* sits just left of the theme button */
  top:0;
  height:48px;width:48px;
  transform:scale(1.5);
  transform-origin:top right;
  border:none;
  border-radius:0 0 0 24px;
  background:
    linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%),
    linear-gradient(180deg,${top} 0%,${bot} 100%);
  box-shadow:
    inset 0 2px 3px rgba(255,255,255,0.08),
    inset 0 -1px 2px rgba(0,0,0,0.4),
    0 4px 8px rgba(0,0,0,0.3);
  cursor:pointer;
  outline:none;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:transform .12s, box-shadow .12s;
}
.volume-btn:active{
  transform:scale(1.45) translateY(2px);
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,0.15),
    inset 0 -1px 2px rgba(0,0,0,0.45),
    0 2px 4px rgba(0,0,0,0.25);
}
.volume-btn::before,
.volume-btn::after{
  content:"";
  position:absolute;
  background:currentColor;
}
.volume-btn::before{                /* speaker */
  width:14px;height:16px;
  clip-path:polygon(0 0,70% 0,100% 25%,100% 75%,70% 100%,0 100%);
  left:13px;top:16px;
}
.volume-btn::after{ left:30px;top:50%;transform:translateY(-50%); }
@keyframes pulseWave{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}
.volume-btn[data-level="0"]::after{width:2px;height:22px;transform:translateY(-50%) rotate(-45deg);}
.volume-btn[data-level="1"]::after{width:6px;height:6px;border:3px solid currentColor;border-left:none;border-bottom:none;border-radius:50%;animation:pulseWave 1s linear infinite;}
.volume-btn[data-level="2"]::after{width:10px;height:10px;border:3px solid currentColor;border-left:none;border-bottom:none;border-radius:50%;box-shadow:6px -6px 0 0 currentColor;animation:pulseWave 1.2s linear infinite;}
.volume-btn[data-level="3"]::after{width:12px;height:12px;border:3px solid currentColor;border-left:none;border-bottom:none;border-radius:50%;box-shadow:6px -6px 0 0 currentColor,12px -12px 0 0 currentColor;animation:pulseWave 1.4s linear infinite;}
  `;
  document.head.appendChild(s);return()=>{document.head.removeChild(s);}
},[theme.mode]);

 
  
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

  /* moved ↑ so it’s defined before first use */
  const toggleTheme = () => setThemeMode(themeMode === "light" ? "dark" : "light");

  const styles = getStyles(theme);

  // Patch styles for larger header title and time
  const bigHeaderTitle = {
    ...styles.gameTitle,
    fontSize: 44, // increase as desired
    lineHeight: 1.1,
  };
  const bigDateTime = {
    ...styles.dateTime,
    fontSize: 28, // increase as desired
    fontWeight: 600,
    letterSpacing: 1,
  };

  return (
    <ThemeProvider theme={theme}>
      <div style={{ ...styles.container, position: "relative" }}>
        {/* Upper left: view-toggle buttons, styled as before */}
        <div className="view-toggle" data-ui style={{ position: 'absolute', left: 0, top: 0 }}>
          {[1, 2].map((r) => (
            <button
              key={r}
              className={`seg ${rowMode === r ? 'active' : ''}`}
              title={`${r === 1 ? 'Single' : r === 2 ? 'Double' : 'Quad'} row`}
              style={{ color: theme.text }}
              onPointerUp={() => {
                setRowMode(r as 1 | 2);
                SoundManager.playUISelect();
              }}
            >
              <GridIcon
                mode={r as 1 | 2}
                filled={rowMode === r}
                size={24}
              />
            </button>
          ))}
        </div>
        {/* Upper right: theme toggle and volume controls */}
        <div
          className="view-toggle"
          data-ui
          style={{
            position: 'absolute',
            left: 'auto',
            right: 0,
            top: 0,
            flexDirection: 'row-reverse',
            width: 'fit-content',
            borderRadius: '0 0 0 24px',
            paddingLeft: 8,
            paddingRight: 8,
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 4,
            transform: 'scale(1.5)',
            transformOrigin: 'top right',
          }}
        >
          <button
            className="seg"
            title="Toggle theme"
            style={{ color: theme.text }}
            onPointerUp={() => {
              toggleTheme();
              SoundManager.playUISelect();
            }}
          >
            <ThemeToggleControl inline />
          </button>
          <button 
            className="seg"
            title={volLevel === 0 ? 'Un-mute' : `Volume ${volLevel}/3`}
            style={{ 
              color: theme.text,
              background: 'transparent',
            }}
            onPointerUp={() => {
              handleVolChange((volLevel + 1) % 4 as VolumeLevel);
              SoundManager.playUISelect();
            }}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24" aria-hidden
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              {/* — rounded speaker body (filled) — */}
              <path
                d="M4 9a1 1 0 0 1 1-1h3.5l4-3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1l-4-3H5a1 1 0 0 1-1-1V9z"
                fill="currentColor" stroke="currentColor" strokeLinejoin="round"
              />
              {/* — sound waves — */}
              {volLevel > 0 && <path d="M15 9.2a3 3 0 0 1 0 5.6" fill="none" />}
              {volLevel > 1 && <path d="M17.5 7a5.5 5.5 0 0 1 0 10" fill="none" />}
              {volLevel > 2 && <path d="M20 5a8 8 0 0 1 0 14" fill="none" />}
              {/* — mute slash — */}
              {volLevel === 0 && <line x1="15" y1="6" x2="22" y2="18" />}
            </svg>
          </button>
        </div>
        {/* Main content */}
        <div>
          <div style={styles.header}>
            <div style={styles.titleWrap}>
              <h2 style={bigHeaderTitle}>{selGame?.title ?? 'Select a game'}</h2>
              {selGame && (
                <div style={styles.hours}>
                  {selGame.hoursPlayed} hour{selGame.hoursPlayed === 1 ? '' : 's'} played
                </div>
              )}
            </div>
            <span style={bigDateTime}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
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
              key={modalMode + (initialData.title ?? '')}
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
        </div>
      </div>
    </ThemeProvider>
  );
}
