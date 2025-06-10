// src/components/GameShelf.tsx

import React, { useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import SoundManager from '../utils/SoundManager';

export interface GameShelfProps {
  textures?: string[];
  width?: number | string;
  height?: number | string;
  frontWidthUnits?: number;   
  frontHeightUnits?: number;  
  onSelect?: (idx: number | null) => void;  
  onLongPress?: (idx: number) => void;       
  rows?: 1 | 2 | 4;            // 1 / 2 / 4 rows
}


const ADD_MARKER  = "__ADD__";
const FULL_W_3DS  = 3236;   // total pixel width of your 3DS scan
const FULL_H_3DS  = 1360;   // total pixel height of your 3DS scan
const BACK_3DS    = 1508;   // back cover width in px (3DS)
const SPINE_3DS   = 120;    // spine width in px (3DS)
const FRONT_3DS   = 1608;   // front cover width in px (3DS)


const HEIGHT_RATIO_3DS = 0.73;

const GameShelf: React.FC<GameShelfProps> = ({
  textures = [],
  width = '100%',
  height = '100%',
  /* bigger covers by default */
  frontWidthUnits = 12,
  frontHeightUnits = 12,
  onSelect,
  onLongPress, 
  rows = 1,                   // default: single row
}) => {


  const container = useRef<HTMLDivElement>(null);
  const renderer  = useRef<THREE.WebGLRenderer>(null!);
  const scene     = useRef<THREE.Scene>(null!);
  const camera    = useRef<THREE.PerspectiveCamera>(null!);
  const shelf     = useRef<THREE.Group>(null!);
  const meshes    = useRef<THREE.Mesh[]>([]);
  const selectedRef = useRef<THREE.Mesh | null>(null);
  const urls      = useRef<string[]>([]); 
  const shellDiv  = useRef<HTMLDivElement>(null);
  /* pixels-per-world-unit at shelf depth (set after each layout pass) */
  const pxPerWorld = useRef<number>(1);
  /* ─ edge-elasticity: 0 = none, 1 = super stretchy ─ */
  const OVERSCROLL_DAMP = 0.15;          // ↓ firmer follow

  // dynamic reveal (world-units), set each layout pass
  const revealWorld = useRef<number>(0);
  
  /* per-layout tuning so single-, double- and quad-row views can be
   * customised independently. Each entry defines:
   *  - scale : base size multiplier for covers
   *  - gapX  : horizontal spacing multiplier (relative to cover width)
   *  - gapY  : vertical spacing multiplier (relative to cover height)
   *  - padTop/bottom : extra empty space above and below the grid
   *  - padLeft/right : extra empty space on the left and right        */
  const LAYOUT = {
    1: { scale: 0.75, gapX: 0.65, gapY: 0.9,  padTop: 0.5, padBottom: 0.5, padLeft: 0.15, padRight: 0.15 },
    2: { scale: 0.40, gapX: 2.10, gapY: 3.10, padTop: 0.3, padBottom: 0.3, padLeft: 0.25, padRight: 0.25 },
    4: { scale: 0.41, gapX: 2.55, gapY: 3.55, padTop: 0.2, padBottom: 0.2, padLeft: 0.2, padRight: 0.2 },
  } as const;
  /** shelf X-bounds after every layout pass */
  const bounds = useRef<{ min: number; max: number }>({ min: 0, max: 0 });

    /* first-gesture flag for background music  */
  const hasPlayedBackground = useRef(false);

  const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;


  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);


  /* remember the last rows value */
  const prevRows = useRef<1 | 2 | 4>(rows);

  // track which mesh is currently centred so we know when to “click”-advance
  const currentCenterIdx = useRef<number | null>(null);
  /* background shell behind the shelf */
  const shellStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,     // pin left & size via JS below
    top: 0,      // full-height
    bottom: 0,   // full-height
    borderRadius: 40,
    /* a hair darker + softer shadow → less “3-D”, more backdrop */
    background: 'linear-gradient(180deg, #2e323c 0%, #1a1c22 100%)',
    boxShadow: '0 0.6em 1em rgba(0,0,0,.55)',
    transition: 'transform 0.3s ease-out',   // smooth snap-back
    pointerEvents: 'none',
    zIndex: -1,               // push the shell *under* the canvas
  };
  /** ----------------------------------------------------------
   *  Helpers
   * --------------------------------------------------------- */
  const selectMesh = (
    mesh: THREE.Mesh | null,
    playSelectSound = false,
  ) => {
    // clear old
     if (selectedRef.current) {
      selectedRef.current.scale.set(1, 1, 1);
      selectedRef.current.rotation.y = 0;
      const prevOutline = selectedRef.current.userData.outline as THREE.Object3D;
      if (prevOutline) prevOutline.visible = false;
    }

    selectedRef.current = mesh;
    if (!mesh) {
      onSelect?.(null);
      return;
    }

    // mark new
   const scale = LAYOUT[rows].scale;
    mesh.scale.set(scale, scale, scale);
    const outline = mesh.userData.outline as THREE.Object3D;
    if (outline) outline.visible = true;

    // slide shelf so this mesh is centred (world-X === 0)
    const worldX = mesh.position.x + shelf.current.position.x;
    shelf.current.position.x -= worldX;
      // ++ sync CSS shell on select
   shellDiv.current!.style.transform =
     `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;

    // notify
    currentCenterIdx.current = meshes.current.indexOf(mesh);
    onSelect?.(currentCenterIdx.current);
    if (playSelectSound) SoundManager.playObjectSelect();
  };


  const buildMats3DS = (tex: THREE.Texture): THREE.Material[] => {
    // enable mipmaps for smooth minification of small details (like text)
    // mark texture as sRGB so GPU applies proper gamma correction
    (tex as any).colorSpace   = THREE.SRGBColorSpace;
    tex.generateMipmaps       = true;              // keep mipmaps for tiny text
    tex.minFilter             = THREE.LinearMipmapLinearFilter;
    tex.magFilter             = THREE.LinearFilter;
    // force maximum anisotropy – the higher the better for oblique viewing
    tex.anisotropy            = renderer.current.capabilities.getMaxAnisotropy();
    tex.needsUpdate     = true;

   
    const BACK_PX   = BACK_3DS;   // 1508 px
    const SPINE_PX  = SPINE_3DS;  //  120 px
    const FRONT_PX  = FRONT_3DS;  // 1608 px
    const FULL_W    = FULL_W_3DS; // 3236 px

    const WIDTH_FACTOR = 0.50; 
    const DEPTH_FACTOR = WIDTH_FACTOR; 


    const NUDGE_SPINE_PX  = 53;
    const NUDGE_BACK_PX   = 0;
    const NUDGE_FRONT_PX  = 55;

    const SCALED_SPINE_PX = SPINE_PX * (DEPTH_FACTOR / WIDTH_FACTOR);
    const SPINE_LEFT_SHIFT = (SPINE_PX - SCALED_SPINE_PX) / 2 + NUDGE_SPINE_PX;

    const U_SPINE_WIDTH  = SCALED_SPINE_PX / FULL_W;
    const U_SPINE_OFFSET = (BACK_PX + SPINE_LEFT_SHIFT) / FULL_W;

    const U_BACK_OFFSET  = NUDGE_BACK_PX / FULL_W;
    const U_BACK_WIDTH   = BACK_PX / FULL_W;

    const U_FRONT_OFFSET = (BACK_PX + SPINE_PX + NUDGE_FRONT_PX) / FULL_W;
    const U_FRONT_WIDTH  = FRONT_PX / FULL_W;

  
    const slice = (u: number, ur: number, flip = false) => {
      const t2 = tex.clone();
      t2.offset.set(u, 0);
      t2.repeat.set(flip ? -ur : ur, 1);
      if (flip) t2.offset.x += ur; 
      return t2;
    };

    const makeMat = (map?: THREE.Texture) =>
      map
        ? new THREE.MeshBasicMaterial({ map })
        : new THREE.MeshBasicMaterial({ color: 0xffffff });

    return [
      makeMat(),                                          // right (empty)
      makeMat(slice(U_SPINE_OFFSET, U_SPINE_WIDTH)),      // spine
      makeMat(),                                          // top (empty)
      makeMat(),                                          // bottom (empty)
      makeMat(slice(U_FRONT_OFFSET, U_FRONT_WIDTH)),      // front
      makeMat(slice(U_BACK_OFFSET, U_BACK_WIDTH)),        // back
    ];
  };


  const WIDTH_FACTOR  = 0.50;               
  const DEPTH_FACTOR  = WIDTH_FACTOR;       
  const PANEL_RATIO   = 4.875 / 5.875;      

  const _BASE_W = FRONT_3DS * (frontWidthUnits / FRONT_3DS);
  const _BASE_D = SPINE_3DS * (frontWidthUnits / FRONT_3DS);

  const BOX_W = _BASE_W * WIDTH_FACTOR;
  const BOX_D = _BASE_D * DEPTH_FACTOR;
  const BOX_H = BOX_W  * PANEL_RATIO;

  /* base hover – row-scale is applied in the render-loop */
  const HOVER_BASE = BOX_H * 0.03;

  /* 4. INIT: scene + camera + pointer + hover  (run only once, on mount)*/
  useEffect(() => {
    if (!container.current) return;
    if (textures.length === 0) return; // skip initialization if no covers

    // Renderer
    renderer.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // --- Colour pipeline -----------------------------------------------
    (renderer.current as any).outputColorSpace = THREE.SRGBColorSpace; // correct gamma
    renderer.current.toneMapping        = THREE.NoToneMapping;         // keep original contrast
    /* leave .toneMappingExposure at default (1) when tone-mapping is off */

    // render at full device resolution for pin-sharp UI
    renderer.current.setPixelRatio(window.devicePixelRatio);
    container.current.appendChild(renderer.current.domElement);
    const canvas = container.current!; // listen on container for full-area panning

    // Scene & Camera
    scene.current = new THREE.Scene();
    camera.current = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.current.position.set(0, 0, BOX_H * 3.0);
    camera.current.lookAt(0, 0, 0);

    // Shelf group
    shelf.current = new THREE.Group();
    scene.current.add(shelf.current);

    // Resize handling
    const resize = () => {
      if (!container.current) return;
      const { clientWidth: w, clientHeight: h } = container.current;
      renderer.current.setSize(w, h);
      camera.current.aspect = w / h;
      camera.current.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    /* Pointer interaction + Raycaster */
    const ray     = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let mode: 'rotate' | 'pan' | null = null;
    let lastX = 0;
    let longTid: number | null = null;
    let moved = false;

    const clearSelect = () => selectMesh(null);


    // Helper to auto-select centered mesh during pan
    const autoSelectCentered = (): void => {
      let nearest: THREE.Mesh | null = null;
      let min = Infinity;
      meshes.current.forEach(m => {
        if (m.userData.isAdd) return;            // skip “add” cube
        const d = Math.abs(m.position.x + shelf.current.position.x);
        if (d < min) {
          min = d;
          nearest = m;
        }
      });
      if (nearest && nearest !== selectedRef.current) selectMesh(nearest, false);
    };

    const cancelLong = (): void => {
      if (longTid !== null) {
        clearTimeout(longTid);
        longTid = null;
      }
    };

    const onPointerDown = (e: PointerEvent): void => {
      dragging = true;
      moved = false;
      lastX = e.clientX;
      cancelLong();
      if (mode === 'rotate' && selectedRef.current && !selectedRef.current.userData.isAdd) {
        selectedRef.current.rotation.y = 0;
      }

      // Play background music once on first "user gesture"
      if (!hasPlayedBackground.current) {
        SoundManager.playBackground();
        hasPlayedBackground.current = true;
      }

      // If the pointer-down did NOT happen inside the canvas we immediately
      // switch to full-page panning — no ray-cast needed.
      if (!(e.target as HTMLElement).closest('canvas')) {
        mode = 'pan';
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(pointer, camera.current);

      // find the *root* mesh that belongs to the main `meshes` array
      const rawHit = ray.intersectObjects(scene.current.children, true)[0]?.object;
      let hit: THREE.Mesh | null = null;
      if (rawHit) {
        let cur: THREE.Object3D | null = rawHit;
        while (cur && !meshes.current.includes(cur as THREE.Mesh)) {
          cur = cur.parent;
        }
        if (cur && meshes.current.includes(cur as THREE.Mesh)) {
          hit = cur as THREE.Mesh;
        }
      }

      if (hit && hit.userData.isAdd) {
        // delegate to parent → opens modal using the actual mesh index
        onSelect?.(-1);
        SoundManager.playUISelect();
        mode = null;
        return;
      }

      if (hit) {
        if (selectedRef.current !== hit) selectMesh(hit, true);
        mode = 'rotate';

        longTid = window.setTimeout(() => {
          longTid = null;
          if (!moved && hit) onLongPress?.(meshes.current.indexOf(hit));
        }, 700);
      } else {
        clearSelect();
        mode = 'pan';
      }
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) cancelLong();

      if (mode === 'rotate' && selectedRef.current && !selectedRef.current.userData.isAdd) {
        selectedRef.current.rotation.y += dx * 0.012;
      } else if (mode === 'pan') {
        /* new elastic pan ------------------------------------------------ */
        const newShelfX = shelf.current.position.x + dx * 0.015;
        const clamped   = clamp(newShelfX, bounds.current.min, bounds.current.max);
        shelf.current.position.x = clamped;

        const overscroll = newShelfX - clamped;   // world-units
        // cap it so the shell never drifts past our reveal-world limit
        const capped = clamp(
          overscroll,
          -revealWorld.current,
           revealWorld.current,
        );
        const shellX = clamped + capped * OVERSCROLL_DAMP;

        if (shellDiv.current) {
          shellDiv.current.style.transform =
            `translateX(${shellX * pxPerWorld.current}px)`;
        }

        // check centre change (skip the “add” cube)
        let nearest = -1, nearestDist = Infinity;
        meshes.current.forEach((m, idx) => {
          if (m.userData.isAdd) return;
          const d = Math.abs(m.position.x + shelf.current.position.x);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = idx;
          }
        });
        if (nearest !== -1 && nearest !== currentCenterIdx.current) {
          SoundManager.playPan();
          selectMesh(meshes.current[nearest], false);
        }
      }
    };

    const onPointerUp = (): void => {
      dragging = false;
      cancelLong();

      if (mode === 'pan' && shellDiv.current) {
        /* snap background back in-bounds */
        shellDiv.current.style.transform =
          `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;
      }

      if (mode === 'pan') {
        // find nearest mesh including the “add” cube
        let nearestIdx = -1, nearestDist = Infinity;
        meshes.current.forEach((m, idx) => {
          const d = Math.abs(m.position.x + shelf.current.position.x);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = idx;
          }
        });
        /* if the “add” cube ends up centred by panning we *do not* open the
           modal – user must click/tap it explicitly                                    */
        if (!meshes.current[nearestIdx]?.userData.isAdd) {
          autoSelectCentered();
        }
      }
    };

    // Remove scroll bar from page
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';             // prevent text-highlight while panning

     // ignore pointer events that originate from UI layers
    const uiFilter = (e: PointerEvent) =>
      !(e.target as HTMLElement)?.closest('[data-ui="true"]');
    const safeDown  = (e: PointerEvent) => uiFilter(e) && onPointerDown(e);
    const safeMove  = (e: PointerEvent) => uiFilter(e) && onPointerMove(e);
    const safeUp    = (e: PointerEvent) => uiFilter(e) && onPointerUp();

    window.addEventListener('pointerdown', safeDown);
    window.addEventListener('pointermove', safeMove);
    window.addEventListener('pointerup',   safeUp);

    /* Hover animation loop */
    let stopAnimation = false;
    const clock = new THREE.Clock();
    const renderLoop = () => {
      if (stopAnimation) return;
      requestAnimationFrame(renderLoop);
      const t = clock.getElapsedTime();
      meshes.current.forEach(m => {
        const ph = m.userData.ph as number;
        m.position.y = (m.userData.homeY || 0) +
         Math.sin(t * 1.2 + ph) * (HOVER_BASE * LAYOUT[rows].scale);
      });
      renderer.current.render(scene.current, camera.current);
    };
    renderLoop();

    return () => {
      document.body.style.overflow       = '';
      document.documentElement.style.overflow = '';
      document.body.style.userSelect = '';
      stopAnimation = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', safeDown);
      window.removeEventListener('pointermove', safeMove);
      window.removeEventListener('pointerup',   safeUp);
      renderer.current.dispose();
    };
  }, []); // ← run only once on mount


  /* ---------- arrow buttons (click / hold) -------------------------------- */
const holdTid = useRef<number | null>(null);   // interval id
const holdDir = useRef<-1 | 1>(1);            // current left / right
  const STEP = () => {
    if (currentCenterIdx.current === null) return;
    const next = clamp(
      currentCenterIdx.current + holdDir.current,
      0,
      Math.max(0, meshes.current.length - 2),   // skip trailing “add” cube
    );
    if (next !== currentCenterIdx.current) selectMesh(meshes.current[next], true);
  };
const startHold = (dir: -1 | 1) => {
  // clear old interval if user alternates buttons quickly
  if (holdTid.current !== null) clearInterval(holdTid.current);

  /* keep direction exactly as button intent (left → -1, right → +1) */
  holdDir.current = dir as -1 | 1;   // cast fixes TS 2322

  STEP();                                   // first step immediately
  holdTid.current = window.setInterval(STEP, 260) as unknown as number;
};
  const stopHold = () => {
    if (holdTid.current !== null) {
      clearInterval(holdTid.current);
      holdTid.current = null;
    }
  };

  /* 5. TEXTURE LOADING + MESH UPDATE (runs whenever textures **or rows** change) */
  useEffect(() => {
    if (!renderer.current) return;

    const texturesChanged = !same(urls.current, textures);
    const rowSwitch       = prevRows.current !== rows;
    if (!texturesChanged && !rowSwitch) return;   // nothing to do

    if (texturesChanged) urls.current = textures.slice();
    prevRows.current = rows;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    textures.forEach((url, i) => {
      /* 5a. Compute box dims (3DS-only) */
      const scaleW = frontWidthUnits / FRONT_3DS;
      const scaleH = frontHeightUnits / (FULL_H_3DS * HEIGHT_RATIO_3DS);
      const scale  = Math.min(scaleW, scaleH);

      /* active size-multiplier (1-row = 1.0) */
      const mul  = LAYOUT[rows].scale;
      const boxW = FRONT_3DS * scale * WIDTH_FACTOR * mul;
      const boxH = boxW * PANEL_RATIO;                 // derived height
      const boxD = SPINE_3DS * scale * DEPTH_FACTOR * mul;
        /* gap proportional to cover width (≈ 25 %) */
      /* horizontal gap ≈ 18 % of cover (tighter grid) */
      const GAP_W = boxW * 0.18;      /* horizontal gap ≈ 18 % */

      /* 5b. Create or reuse mesh */
      let mesh = meshes.current[i];
      const isAdd = url === ADD_MARKER;
      const bevelRadius = Math.min(boxW, boxH) * 0.02;

      if (!mesh) {
        // 1) Create the box itself
          const geo = isAdd
            ? new RoundedBoxGeometry(boxW * 0.8, boxW * 0.8, boxD * 0.02, 8, bevelRadius)
            : new RoundedBoxGeometry(boxW, boxH, boxD, 16, bevelRadius);
          mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));

          mesh.userData.isAdd = isAdd;          // flag “add” cube
          mesh.userData.ph    = Math.random() * Math.PI * 2;
          shelf.current.add(mesh);
          meshes.current[i]   = mesh;

          /* leave padding all-round */
          mesh.userData.padding = bevelRadius * 2;
          if (!isAdd) {
            // 2) Create a simple “wall" behind this box
          // create a rounded-rectangle shape for beveled shadow
          const sw = boxW * 1.6, sh = boxH * 1.6;
          const radius = Math.min(sw, sh) * 0.1; // container bevel amount
          const shape = new THREE.Shape();
          shape.moveTo(-sw/2 + radius, -sh/2);
          shape.lineTo(sw/2 - radius, -sh/2);
          shape.quadraticCurveTo(sw/2, -sh/2, sw/2, -sh/2 + radius);
          shape.lineTo(sw/2, sh/2 - radius);
          shape.quadraticCurveTo(sw/2, sh/2, sw/2 - radius, sh/2);
          shape.lineTo(-sw/2 + radius, sh/2);
          shape.quadraticCurveTo(-sw/2, sh/2, -sw/2, sh/2 - radius);
          shape.lineTo(-sw/2, -sh/2 + radius);
          shape.quadraticCurveTo(-sw/2, -sh/2, -sw/2 + radius, -sh/2);
          const shadowGeo = new THREE.ShapeGeometry(shape);
          const shadow = new THREE.Mesh(
            shadowGeo,
            new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.05, transparent: true, side: THREE.DoubleSide })
          );
          shadow.rotation.y = Math.PI;
          mesh.userData.shadow = shadow;
          shelf.current.add(shadow);
          // create corner brackets (four "L" shapes) around shadow
          const bracketGroup = new THREE.Group();
          const bracketLength = Math.min(sw, sh) * 0.2;
          const mat = new THREE.LineBasicMaterial({ color: 0xffa500 });

          // helper to create a thick, inward-pointing "L" at given corner
          const makeBracket = (cx: number, cy: number) => {
            const dirX = cx < 0 ? 1 : -1;
            const dirY = cy < 0 ? 1 : -1;
            const thickness = bracketLength * 0.2;
            const depth = thickness; // small Z-depth for visibility
            const group = new THREE.Group();

            // Horizontal segment
            const geomH = new RoundedBoxGeometry(bracketLength, thickness, depth, 4, thickness * 0.4);
            const meshH = new THREE.Mesh(geomH, new THREE.MeshBasicMaterial({ color: 0xffa500 }));
            meshH.position.set(cx + (dirX * bracketLength) / 2, cy, 0);
            group.add(meshH);

            // Vertical segment
            const geomV = new RoundedBoxGeometry(thickness, bracketLength, depth, 4, thickness * 0.4);
            const meshV = new THREE.Mesh(geomV, new THREE.MeshBasicMaterial({ color: 0xffa500 }));
            meshV.position.set(cx, cy + (dirY * bracketLength) / 2, 0);
            group.add(meshV);

            return group;
          };

          // corners: (±sw/2, ±sh/2)
          bracketGroup.add(makeBracket(-sw / 2, -sh / 2)); // bottom-left
          bracketGroup.add(makeBracket(sw / 2, -sh / 2));  // bottom-right
          bracketGroup.add(makeBracket(sw / 2, sh / 2));   // top-right
          bracketGroup.add(makeBracket(-sw / 2, sh / 2));  // top-left
          bracketGroup.visible = false;
          mesh.userData.outline = bracketGroup;
          shelf.current.add(bracketGroup);
          }                             /* ← end !isAdd */
        }

        // Now mesh points to our box; next we’ll update its material (if needed),
        // and position both box and its shadow in the layout.
        mesh = meshes.current[i];
        const wasAdd = !!mesh.userData.isAdd;   // save previous role
        mesh.userData.isAdd = isAdd;

                /* remove lingering “+” from a previous add-cube */
        if (wasAdd && !isAdd && mesh.userData.plusBuilt) {
          (mesh.children as THREE.Object3D[])
            .filter(c => (c as any).userData?.isPlus)
            .forEach(c => mesh.remove(c));
          delete mesh.userData.plusBuilt;
        }

        /* geometry swap ─ when a former “add” cube turns into a real cover
           (or vice-versa) we need to rebuild the box shape */
        if (wasAdd !== isAdd) {

          mesh.geometry.dispose();
          mesh.geometry = isAdd
            ? new RoundedBoxGeometry(boxW * 0.8, boxW * 0.8, boxD * 0.1, 8, bevelRadius)
            : new RoundedBoxGeometry(boxW, boxH, boxD, 16, bevelRadius);
            
          /* when converting from an “add” cube, build missing background */
          if (wasAdd && !isAdd) {
            const sw = boxW * 1.6, sh = boxH * 1.6;
            const radius = Math.min(sw, sh) * 0.1;
            const shape = new THREE.Shape();
            shape.moveTo(-sw / 2 + radius, -sh / 2);
            shape.lineTo(sw / 2 - radius, -sh / 2);
            shape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + radius);
            shape.lineTo(sw / 2, sh / 2 - radius);
            shape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - radius, sh / 2);
            shape.lineTo(-sw / 2 + radius, sh / 2);
            shape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - radius);
            shape.lineTo(-sw / 2, -sh / 2 + radius);
            shape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + radius, -sh / 2);
            const shadowGeo = new THREE.ShapeGeometry(shape);
            const shadow = new THREE.Mesh(
              shadowGeo,
              new THREE.MeshBasicMaterial({
                color: 0xffffff,
                opacity: 0.05,
                transparent: true,
                side: THREE.DoubleSide,
              }),
            );
            shadow.rotation.y = Math.PI;
            mesh.userData.shadow = shadow;
            shelf.current.add(shadow);

            const bracketGroup = new THREE.Group();
            const bracketLength = Math.min(sw, sh) * 0.2;
            const makeBracket = (cx: number, cy: number) => {
              const dirX = cx < 0 ? 1 : -1;
              const dirY = cy < 0 ? 1 : -1;
              const thickness = bracketLength * 0.2;
              const depth = thickness;
              const group = new THREE.Group();
              const geomH = new RoundedBoxGeometry(bracketLength, thickness, depth, 4, thickness * 0.4);
              const meshH = new THREE.Mesh(geomH, new THREE.MeshBasicMaterial({ color: 0xffa500 }));
              meshH.position.set(cx + (dirX * bracketLength) / 2, cy, 0);
              group.add(meshH);
              const geomV = new RoundedBoxGeometry(thickness, bracketLength, depth, 4, thickness * 0.4);
              const meshV = new THREE.Mesh(geomV, new THREE.MeshBasicMaterial({ color: 0xffa500 }));
              meshV.position.set(cx, cy + (dirY * bracketLength) / 2, 0);
              group.add(meshV);
              return group;
            };

            bracketGroup.add(makeBracket(-sw / 2, -sh / 2));
            bracketGroup.add(makeBracket(sw / 2, -sh / 2));
            bracketGroup.add(makeBracket(sw / 2, sh / 2));
            bracketGroup.add(makeBracket(-sw / 2, sh / 2));
            bracketGroup.visible = false;
            mesh.userData.outline = bracketGroup;
            shelf.current.add(bracketGroup);
          }
        }


      /* 5c. Load texture if URL changed */
      if (url === ADD_MARKER) {
        mesh.userData.isAdd = true;                       // “add” cube
        /* make the cube invisible – we only keep it for hit-testing & spacing */
        const invisible = new THREE.MeshBasicMaterial({ transparent:true, opacity:0 });
        mesh.material = Array(6).fill(invisible);

        /* 3-D yellow “+” --------------------------------------------------------- */
        if (!mesh.userData.plusBuilt) {
          const barT = boxW * 0.10;                       // thickness
          const barL = boxW * 0.46;                       // length
          const barD = boxD * 0.35;
          const r    = barT * 0.9;                        // bevel
          const barGeoH = new RoundedBoxGeometry(barL, barT, barD, 6, r);
          const barGeoV = new RoundedBoxGeometry(barT, barL, barD, 6, r);
          const barMat  = new THREE.MeshBasicMaterial({ color: 0xffbe32 });
          const barH = new THREE.Mesh(barGeoH, barMat);
          const barV = new THREE.Mesh(barGeoV, barMat);
          const plusGrp = new THREE.Group();
          plusGrp.userData.isPlus = true;
          plusGrp.add(barH);
          plusGrp.add(barV);
          barH.position.z = barV.position.z = boxD * 0.55; // lift slightly in front
          mesh.add(plusGrp);
          mesh.userData.plusBuilt = true;
        }
        mesh.userData.url = url;
      } else if (mesh.userData.url !== url) {
        loader.load(
          url,
          (tex) => {
            mesh.material = buildMats3DS(tex);
            mesh.userData.url = url;
          },
          undefined,
          () => {
            mesh.material = new THREE.MeshBasicMaterial({ color: 0x555555 });
            mesh.userData.url = url;
          }
        );
      }

      /* 5d. Store dims for layout (note: “add” cube is only 10 % thick) */
      mesh.userData.actualWidth  = boxW;
      mesh.userData.actualHeight = boxH;
      mesh.userData.actualDepth  = isAdd ? boxD * 0.1 : boxD;
    });

    // Remove any extra meshes
    while (meshes.current.length > textures.length) {
      const m = meshes.current.pop()!;
      shelf.current.remove(m);
      (m.material as any).dispose?.();
      m.geometry.dispose();
    }

    /* ───────────── ROW LAYOUT (row-major, even gaps) ───────────── */
    const all    = meshes.current;
    const mul    = LAYOUT[rows].scale;
    const itemW  = BOX_W * mul;              // uniform cover width
    const itemH  = BOX_H * mul;

    /* resolve spacing and padding from the layout table */
    const cfg = LAYOUT[rows];
    const gapX = itemW * cfg.gapX;    // breathing room between columns
    const gapY = itemH * cfg.gapY;    // vertical spacing between rows
    const padTop = itemH * cfg.padTop;
    const padBottom = itemH * cfg.padBottom;
    const padLeft = itemW * cfg.padLeft;
    const padRight = itemW * cfg.padRight;


    const cols   = Math.ceil(all.length / rows);
    const rowW   = cols * itemW + (cols - 1) * gapX + padLeft + padRight;  // world units
    const gridH  = rows * itemH + (rows - 1) * gapY + padTop + padBottom;
    

    all.forEach((m, i) => {
      const r = Math.floor(i / cols);        // row 0…rows-1
      const c = i % cols;                    // col 0…cols-1

      const xOffset = (padLeft - padRight) / 2;
      const x = (c - (cols - 1) / 2) * (itemW + gapX) + xOffset;
      const yOffset = (padTop - padBottom) / 2;
      const y = ((rows - 1) / 2 - r) * gapY - yOffset;

      m.position.set(x, y, 0);
      m.userData.homeY = y;

      if (!m.userData.isAdd && m.userData.shadow && m.userData.outline) {
        const z = (m.userData.actualDepth as number) / 2 + 0.01;
        m.userData.shadow.position.set(x, y, z);
        m.userData.outline.position.set(x, y, z);
        m.userData.outline.visible = selectedRef.current === m; // <–– Fix remaining selected reference
      }
    });

    /* ------------ update camera Z so every grid fits on screen ----------- */
    camera.current.position.z = BOX_H *
      (rows === 1 ? 3.6 : rows === 2 ? 6.8 : 12.0);

    /* pan limits: first & last columns can be centred */
    bounds.current.min = -((cols - 1) / 2) * (itemW + gapX) - padLeft;
    bounds.current.max =  ((cols - 1) / 2) * (itemW + gapX) + padRight;

    // ─── compute px-per-world at shelf depth ───────────────────────
    const canvasEl   = renderer.current.domElement;
    pxPerWorld.current = canvasEl.clientHeight
      / (2 * camera.current.position.z
          * Math.tan((camera.current.fov * Math.PI / 180) / 2));

    // ─── adaptive reveal: 60% of ONE cover’s width ───
    const revealWorldVal = itemW * 0.6;       // in world-units
    revealWorld.current  = revealWorldVal;
    const shellRevealPx   = revealWorldVal * pxPerWorld.current;

          // define rowPx & leftPx so TS won’t complain
    const containerW = canvasEl.clientWidth;
    const rowPx  = rowW * pxPerWorld.current;
    const leftPx = (containerW - (rowPx + shellRevealPx * 2)) / 2
                 + shelf.current.position.x * pxPerWorld.current;

    // ─── size & position shell to exactly cover the row ───────
    shellDiv.current!.style.width     = `${rowPx + shellRevealPx * 2}px`;
    shellDiv.current!.style.left      = `${leftPx}px`;
    shellDiv.current!.style.transform = '';  // clear previous translateX

        // slide shell in sync with ThreeJS pan
    shellDiv.current!.style.transform =
      `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;

    /* keep selection centred after row-switch */
    if (selectedRef.current) {
      const worldX = selectedRef.current.position.x + shelf.current.position.x;
      shelf.current.position.x -= worldX;
    } else {
      shelf.current.position.x = clamp(
        shelf.current.position.x,
        bounds.current.min,
        bounds.current.max,
      );
    }

        // ----------------------------------------------------------------
    // Ensure there's always an initial selection for arrow navigation
    if (!selectedRef.current && meshes.current.length > 0) {
      selectMesh(meshes.current[0], false);
    }
    // ----------------------------------------------------------------
    // ++ sync CSS shell after layout
       shellDiv.current!.style.transform =
      `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;
    /* re-run when textures or row-count change */
  }, [textures, rows, frontWidthUnits, frontHeightUnits]);


  /* 6. Render container div */
  return (
    <div
      ref={container}
          /* new z-index starts a stacking context so the shell’s -1 stays local */
      style={{ width, height, position: 'relative', overflow: 'visible', userSelect: 'none', touchAction: 'none', zIndex: 0 }}
    >
     {/* backdrop shell – now lives *under* the WebGL canvas */}
      <div ref={shellDiv} style={shellStyle} />
      {/* ← arrow */}
      <div
        onMouseDown={() => startHold(-1)}
        onMouseUp={stopHold}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 140,
          height: 140,
          /* rounder quarter-circle outer edge */
          borderTopRightRadius: 100,
          borderBottomRightRadius: 100,
          background: 'linear-gradient(180deg, #3b404d 0%, #1d1f26 100%)',
          boxShadow: '0 0.9em 1.4em rgba(0,0,0,.65), 0 .04em .04em -.01em rgba(5,5,5,1), 0 .008em .008em -.01em rgba(5,5,5,.5), .18em .36em .14em -.03em rgba(5,5,5,.25)',
          display: 'flex',
          color: '#ffffff',
          fontSize: 64,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform .15s, filter .12s',
          /* thin bottom rim highlight to match command-bar */
          boxSizing: 'border-box',
          borderBottom: '2px solid rgba(255,255,255,.12)',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          const tgt = e.currentTarget;
          tgt.style.transform = 'translateY(-50%) scale(1.05)';
          tgt.style.filter    = 'brightness(1.25)';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          stopHold();
          const tgt = e.currentTarget;
          tgt.style.transform = 'translateY(-50%)';
          tgt.style.filter    = '';
        }}
      >
        &#9664;
      </div>

      {/* → arrow */}
      <div
        onMouseDown={() => startHold(1)}
        onMouseUp={stopHold}
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 140,
          height: 140,
          borderTopLeftRadius: 100,
          borderBottomLeftRadius: 100,
          background: 'linear-gradient(180deg, #3b404d 0%, #1d1f26 100%)',
          boxShadow: '0 .8em 1.4em rgba(0,0,0,.6), 0 .04em .04em -.01em rgba(5,5,5,1), 0 .008em .008em -.01em rgba(5,5,5,.5), .18em .36em .14em -.03em rgba(5,5,5,.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform .15s, filter .12s',
          color: '#ffffff',
          fontSize: 64,                  /* big white triangle */
          boxSizing: 'border-box',
          borderBottom: '2px solid rgba(255,255,255,.12)',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          const tgt = e.currentTarget;
          tgt.style.transform = 'translateY(-50%) scale(1.05)';
          tgt.style.filter    = 'brightness(1.25)';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          stopHold();
          const tgt = e.currentTarget;
          tgt.style.transform = 'translateY(-50%)';
          tgt.style.filter    = '';
        }}
      >
        &#9654;
      </div>
    </div>
  );
};
export default GameShelf;
