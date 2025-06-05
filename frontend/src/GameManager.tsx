// src/GameManager.tsx

import React, { useState, useEffect } from "react";
import GameShelf from "./components/GameShelf";
import AddGameModal, { GameForm } from "./components/AddGameModal";
import { styles } from "./styles/GameManager.styles";
import { neonBtn } from "./utils/styles";
import useGames, { Game } from "./hooks/useGames";
import Overlay from "./components/Overlay";
import SoundManager from "./utils/SoundManager";

export default function GameManager() {
  const { games, loadGames, API } = useGames();

  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [updating, setUpdating] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalOpen, setModalOpen] = useState(false);

  const [initialData, setInitialData] = useState<Partial<GameForm>>({});

  const [romExists, setRomExists] = useState(false);
  const [emuExists, setEmuExists] = useState(false);

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
    setEditMode(false);
    setEditTitle("");
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
    setSelIdx(i);
    setEditMode(false);
    setOverlayOpen(i !== null);
    if (i !== null) {
      SoundManager.playObjectSelect();
    }
  };

  const handleLongPressFromShelf = (i: number) => {
    setSelIdx(i);
    setEditMode(true);
    setOverlayOpen(true);
    SoundManager.playUISelect();
  };

  const SHELF_H = Math.min(400, vw * 0.6);
  const titleChanged = editTitle.trim() !== (selGame?.title.trim() ?? "").trim();

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🎮 Game Shelf</h1>

      <div style={styles.controlRow}>
        <button
          style={neonBtn(false)}
          onClick={() => {
            SoundManager.playUISelect();
            setModalMode("add");
            setInitialData({});
            setModalOpen(true);
          }}
        >
          Add New Game
        </button>
        <button
          style={neonBtn(false)}
          onClick={() => {
            SoundManager.playUISelect();
            replaceCollection();
          }}
        >
          Replace Collection
        </button>
        <button
          style={neonBtn(false, true)}
          onClick={() => {
            SoundManager.playUIBack();
            deleteAllGames();
          }}
        >
          Delete All Games
        </button>
      </div>

      <div style={styles.divider} />

      {selGame && overlayOpen && (
        <Overlay
          flash={flashOk}
          editMode={editMode}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          updating={updating}
          titleChanged={titleChanged}
          onUpdate={() => {
            SoundManager.playUISelect();
            setModalMode("edit");
            setInitialData({
              title: editTitle,
              coverFile: null,
              romPath: selGame.romPath,
              emuPath: selGame.emuPath,
            });
            setModalOpen(true);
          }}
          onDelete={() => {
            SoundManager.playUIBack();
            deleteGame(selGame.id);
          }}
          onDismiss={() => {
            SoundManager.playUIBack();
            setSelIdx(null);
            setEditMode(false);
            setOverlayOpen(false);
          }}
          emulatorFound={emuExists}
          romFound={romExists}
          onPlay={() => {
            SoundManager.playUISelect();

            const api = (window as any).launcherAPI;
            if (!api || typeof api.exists !== "function" || typeof api.play !== "function") {
              console.error("launcherAPI is not available or missing methods.");
              window.alert("Cannot launch: launcherAPI is not available.");
              return;
            }

            Promise.all([api.exists(selGame.romPath), api.exists(selGame.emuPath)])
              .then(([romOk, emuOk]) => {
                if (!romOk || !emuOk) {
                  window.alert("Error launching emulator: ROM or Emulator missing");
                  return null;
                }
                console.log("Launching with:", { emuPath: selGame.emuPath, romPath: selGame.romPath });
                return api.play(selGame.emuPath, selGame.romPath);
              })
              .then((playResult: any) => {
                if (playResult && playResult.ok === false) {
                  console.error("Play returned error:", playResult.error);
                  window.alert("Error launching emulator:\n" + playResult.error);
                }
              })
              .catch((err: any) => {
                console.error("IPC play error:", err);
                window.alert("Error launching emulator (see console).");
              });
          }}
        />
      )}

      {games.length > 0 && (
        <div style={{ width: "100%", height: SHELF_H }}>
          <GameShelf
            textures={games.map((g) => `${API}${g.imageUrl}`)}
            width="100%"
            height="100%"
            onSelect={handleSelectFromShelf}
            onLongPress={handleLongPressFromShelf}
          />
        </div>
      )}

      {modalOpen && (
        <AddGameModal
          mode={modalMode}
          initial={initialData}
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
    </div>
  );
}
