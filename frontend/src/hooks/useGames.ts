// src/hooks/useGames.ts

import { useState, useCallback } from 'react';
const API = 'http://localhost:3001';

export type Platform =  '3DS';


export interface Game {
  id: number;
  title: string;
  platform: Platform;
  imageUrl: string;
  romPath: string;
  emuPath: string;
  hoursPlayed: number;
}

export default function useGames() {
  const [games, setGames] = useState<Game[]>([]);

  const loadGames = useCallback(() => {
    fetch(`${API}/api`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch games (${r.status})`);
        return r.json();
      })
      .then((data: Game[]) => {
        setGames(data);
      })
      .catch((err: Error) => {
        console.error(err);
        window.alert(`Error loading games: ${err.message}`);
      });
  }, []);

  return { games, setGames, loadGames, API };
}
