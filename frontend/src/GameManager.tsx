// src/GameManager.tsx

import React, { useState, useEffect } from "react";
import GameShelf from "./components/GameShelf";
import AddGameModal, { GameForm } from "./components/AddGameModal";
import { styles } from "./styles/GameManager.styles";
import { neonBtn } from "./utils/styles";
import useGames, { Game } from "./hooks/useGames";
import SoundManager from "./utils/SoundManager";
import CommandBar from "./components/CommandBar";

export default function GameManager() {
  const ADD_MARKER = "__ADD__";           // sentinel for “Add Game” cube
  const { games, loadGames, API } = useGames();

  const [selIdx, setSelIdx] = useState<number | null>(null);
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

  const SHELF_H = Math.min(520, vw * 0.);
  const titleChanged = editTitle.trim() !== (selGame?.title.trim() ?? "").trim();
  const canLaunch   = !!selGame && romExists && emuExists;
 
  
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

  return (
    <div style={styles.container}>
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
      </div>
        <div style={{ ...styles.middle, height: SHELF_H }}>
        <GameShelf
          textures={[...games.map((g) => `${API}${g.imageUrl}`), ADD_MARKER]}
          width="100%"
          height="100%"
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
    </div>
  );
}
