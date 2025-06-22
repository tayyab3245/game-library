import { useRef } from 'react';
import * as THREE from 'three';
import { clamp } from './helpers';
import { LAYOUT, OVERSCROLL_DAMP } from './constants';
import SoundManager from '../../utils/SoundManager';

export interface ShelfControlParams {
  container: React.RefObject<HTMLDivElement | null>;
  camera: React.RefObject<THREE.PerspectiveCamera>;
  scene: React.RefObject<THREE.Scene>;
  shelf: React.RefObject<THREE.Group>;
  meshes: React.MutableRefObject<THREE.Mesh[]>;
  selectedRef: React.MutableRefObject<THREE.Mesh | null>;
  shellDiv: React.RefObject<HTMLDivElement | null>;
  pxPerWorld: React.MutableRefObject<number>;
  revealWorld: React.MutableRefObject<number>;
  bounds: React.MutableRefObject<{ min: number; max: number }>;
  currentCenterIdx: React.MutableRefObject<number | null>;
  rows: 1 | 2;
  selectMesh: (mesh: THREE.Mesh | null, playSound?: boolean) => void;
  onSelect?: (idx: number | null) => void;
  onLongPress?: (idx: number) => void;
  hasPlayedBackground: React.MutableRefObject<boolean>;
  layoutInfo: React.RefObject<{ cols: number }>;

}

export default function useShelfControls(opts: ShelfControlParams) {
  const holdTid = useRef<number | null>(null);
  // holdDir now tracks x and y movement
  const holdDir = useRef<{ x: -1 | 0 | 1; y: -1 | 0 | 1 }>({ x: 0, y: 0 });

  /* NEW Grid-Aware scroll/arrow helper */
  const STEP = () => {
    const playable = opts.meshes.current.filter(m => !m.userData.isAdd);
    if (!playable.length) return;

    const cols = opts.layoutInfo.current.cols;
    const rows = opts.rows;
    if (cols === 0) return; // Grid not ready

    const curIdx = playable.findIndex(m => m === opts.selectedRef.current);
    const current = curIdx === -1 ? 0 : curIdx;
    const dir = holdDir.current;
    let nextIdx = current;

    // Handle navigation based on the current layout
    if (rows === 2) {
      // 2-Row (Column-Major) Navigation
      const curCol = Math.floor(current / rows);
      const curRow = current % rows;
      if (dir.x === 1) { // Right
        nextIdx = current + rows;
      } else if (dir.x === -1) { // Left
        nextIdx = current - rows;
      } else if (dir.y === 1) { // Down
        if (curRow < rows - 1) nextIdx = current + 1;
      } else if (dir.y === -1) { // Up
        if (curRow > 0) nextIdx = current - 1;
      }
    } else {
      // 1-Row (Row-Major) Navigation
      if (dir.x === 1) { // Right
        nextIdx = current + 1;
      } else if (dir.x === -1) { // Left
        nextIdx = current - 1;
      }
    }

    // Make sure the new index is within the valid range of playable items
    nextIdx = clamp(nextIdx, 0, playable.length - 1);

    if (nextIdx !== current) {
      opts.selectMesh(playable[nextIdx], true);
      opts.currentCenterIdx.current = opts.meshes.current.indexOf(
        playable[nextIdx]
      );
    }
  };

  const startHold = (dir: { x: -1 | 0 | 1; y: -1 | 0 | 1 }) => {
    if (holdTid.current !== null) clearInterval(holdTid.current);
    holdDir.current = dir;
    STEP();
    holdTid.current = window.setInterval(STEP, 260) as unknown as number;
  };

  const stopHold = () => {
    if (holdTid.current !== null) {
      clearInterval(holdTid.current);
      holdTid.current = null;
    }
  };

  // 2D nearest-to-center helper
  const findNearestToCenter = () => {
    let nearest: (THREE.Mesh & { userData: any }) | null = null;
    let minDistanceSq = Infinity;
    const targetX = -opts.shelf.current.position.x;
    const targetY = 0;
    opts.meshes.current.forEach((m) => {
      if ((m as any).userData.isAdd) return;
      const dx = m.position.x - targetX;
      const dy = m.position.y - targetY;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        nearest = m as THREE.Mesh & { userData: any };
      }
    });
    return nearest;
  };

  const registerKeyboard = () => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Pass direction vectors to startHold
      if (e.code === 'ArrowLeft') startHold({ x: -1, y: 0 });
      else if (e.code === 'ArrowRight') startHold({ x: 1, y: 0 });
      else if (e.code === 'ArrowUp') startHold({ x: 0, y: -1 });
      else if (e.code === 'ArrowDown') startHold({ x: 0, y: 1 });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        stopHold();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  };

  const registerPointer = () => {
    if (!opts.container.current) return () => {};

    const canvas = opts.container.current;
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let mode: 'rotate' | 'pan' | null = null;
    let lastX = 0;
    let longTid: number | null = null;
    let moved = false;

    const clearSelect = () => opts.selectMesh(null);

    // autoSelectCentered uses 2D-aware logic
    const autoSelectCentered = () => {
      const nearest = findNearestToCenter();
      if (nearest && nearest !== opts.selectedRef.current) {
        opts.selectMesh(nearest, false);
      }
    };

    const cancelLong = () => {
      if (longTid !== null) {
        clearTimeout(longTid);
        longTid = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = e.clientX;
      cancelLong();
      if (mode === 'rotate' && opts.selectedRef.current && !opts.selectedRef.current.userData.isAdd) {
        opts.selectedRef.current.rotation.y = 0;
      }

      if (!opts.hasPlayedBackground.current) {
        SoundManager.playBackground();
        opts.hasPlayedBackground.current = true;
      }

      if (!(e.target as HTMLElement).closest('canvas')) {
        mode = 'pan';
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(pointer, opts.camera.current);

      const rawHit = ray.intersectObjects(opts.scene.current.children, true)[0]?.object;
      let hit: THREE.Mesh | null = null;
      if (rawHit) {
        let cur: THREE.Object3D | null = rawHit;
        while (cur && !opts.meshes.current.includes(cur as THREE.Mesh)) {
          cur = cur.parent;
        }
        if (cur && opts.meshes.current.includes(cur as THREE.Mesh)) {
          hit = cur as THREE.Mesh;
        }
      }

      if (hit && (hit as any).userData.isAdd) {
        opts.onSelect?.(-1);
        SoundManager.playUISelect();
        mode = null;
        return;
      }

      if (hit) {
        opts.selectMesh(hit, true);
        mode = 'rotate';

        longTid = window.setTimeout(() => {
          longTid = null;
          if (!moved && hit) opts.onLongPress?.(opts.meshes.current.indexOf(hit));
        }, 700);
      } else if (opts.rows !== 1 || !opts.selectedRef.current) {
        clearSelect();
        mode = 'pan';
      } else {
        mode = opts.selectedRef.current ? 'rotate' : 'pan';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) cancelLong();

      if (mode === 'rotate' && opts.selectedRef.current && !opts.selectedRef.current.userData.isAdd) {
        opts.selectedRef.current.rotation.y += dx * 0.012;
      } else if (mode === 'pan') {
        const newShelfX = opts.shelf.current.position.x + dx * 0.015;
        const clamped = clamp(newShelfX, opts.bounds.current.min, opts.bounds.current.max);
        opts.shelf.current.position.x = clamped;

        const overscroll = newShelfX - clamped;
        const capped = clamp(overscroll, -opts.revealWorld.current, opts.revealWorld.current);
        const shellX = clamped + capped * OVERSCROLL_DAMP;

        if (opts.shellDiv.current) {
          opts.shellDiv.current.style.transform = `translateX(${shellX * opts.pxPerWorld.current}px)`;
        }

        // 2D-aware selection logic
        const nearestMesh = findNearestToCenter();
        if (nearestMesh) {
          const nearestIdx = opts.meshes.current.indexOf(nearestMesh);
          if (nearestIdx !== -1 && nearestIdx !== opts.currentCenterIdx.current) {
            SoundManager.playPan();
            opts.selectMesh(nearestMesh, false);
          }
        }
      }
    };

    const onPointerUp = () => {
      dragging = false;
      cancelLong();

      if (mode === 'pan' && opts.shellDiv.current) {
        opts.shellDiv.current.style.transform = `translateX(${opts.shelf.current.position.x * opts.pxPerWorld.current}px)`;
      }

      if (mode === 'pan') {
        // 2D-aware selection logic
        const nearestMesh = findNearestToCenter();
        if (nearestMesh && !(nearestMesh as any).userData.isAdd) {
          opts.selectMesh(nearestMesh, true);
        }
      }
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';

    const uiFilter = (e: PointerEvent) => !(e.target as HTMLElement)?.closest('[data-ui="true"]');
    const safeDown = (e: PointerEvent) => {
      if (uiFilter(e)) {
        dragging = true;
        moved = false;
        lastX = e.clientX;
        onPointerDown(e);
      }
    };
    const safeMove = (e: PointerEvent) => {
      if (uiFilter(e) && dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;

        if (mode === 'rotate' && opts.selectedRef.current) {
          opts.selectedRef.current.rotation.y += dx * 0.012;
          moved = true;
        } else {
          onPointerMove(e);
        }
      }
    };
    const safeUp = (e: PointerEvent) => {
      if (uiFilter(e)) {
        dragging = false;
        onPointerUp();
      }
    };

    window.addEventListener('pointerdown', safeDown);
    window.addEventListener('pointermove', safeMove);
    window.addEventListener('pointerup', safeUp);

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointerdown', safeDown);
      window.removeEventListener('pointermove', safeMove);
      window.removeEventListener('pointerup', safeUp);
    };
  };

  const attach = () => {
    const cleanPtr = registerPointer();
    const cleanKey = registerKeyboard();
    return () => {
      cleanPtr();
      cleanKey();
      stopHold();
    };
  };

  return { startHold, stopHold, attach };
}