// src/components/index.tsx
import React, { useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import SoundManager from '../../utils/SoundManager';
import {
  ADD_MARKER,
  FULL_H_3DS,
  SPINE_3DS,
  FRONT_3DS,
  HEIGHT_RATIO_3DS,
  WIDTH_FACTOR,
  DEPTH_FACTOR,
  PANEL_RATIO,
  LAYOUT,
} from './constants';
import { shellStyle, getArrowCSS } from './styles';
import { useTheme } from '../../theme/ThemeContext';
import { clamp, same } from './helpers';
import useShelfControls from './useShelfControls';
import { buildMats3DS } from './materials';


export interface GameShelfProps {
  textures?: string[];
  width?: number | string;
  height?: number | string;
  frontWidthUnits?: number;   
  frontHeightUnits?: number;  
  onSelect?: (idx: number | null) => void;  
  onLongPress?: (idx: number) => void;       
  rows?: 1 | 2 ;            // 1 / 2 / 4 rows
}
  
const GameShelf: React.FC<GameShelfProps> = ({
  textures = [],
  width = '100%',
  height = '100%',
  frontWidthUnits = 12,
  frontHeightUnits = 12,
  onSelect,
  onLongPress,
  rows = 1,
}) => {
const theme = useTheme();

  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.dataset.owner = "gameshelf-arrows";   // unique tag for safe cleanup
    style.innerHTML = getArrowCSS(theme);
    document.head.appendChild(style);
    return () => {
      style.remove(); //  this fixes the TS2345 warning
    };
  }, [theme.mode]);
  const container = useRef<HTMLDivElement>(null);
  const renderer  = useRef<THREE.WebGLRenderer>(null!);
  const scene     = useRef<THREE.Scene>(null!);
  const camera    = useRef<THREE.PerspectiveCamera>(null!);
  const shelf     = useRef<THREE.Group>(null!);
  const meshes    = useRef<THREE.Mesh[]>([]);
  const selectedRef = useRef<THREE.Mesh | null>(null);
  const urls      = useRef<string[]>([]);
  const shellDiv  = useRef<HTMLDivElement>(null);
  const shelfTargetX = useRef<number>(0); // <-- ADD THIS: Stores the shelf's target X position.
  const layoutInfo = useRef({ cols: 0 }); // <-- ADD THIS LINE
  /* pixels-per-world-unit at shelf depth (set after each layout pass) */
  const pxPerWorld = useRef<number>(1);
  /* ─ edge-elasticity: 0 = none, 1 = super stretchy ─ */
  // dynamic reveal (world-units), set each layout pass
  const revealWorld = useRef<number>(0);
  /* per-layout tuning so single-, double- and quad-row views can be
   * customised independently. Each entry defines:
   *  - scale : base size multiplier for covers
   *  - gapX  : horizontal spacing multiplier (relative to cover width)
   *  - gapY  : vertical spacing multiplier (relative to cover height)
   *  - padTop/bottom : extra empty space above and below the grid
   *  - padLeft/right : extra empty space on the left and right        */
  /** shelf X-bounds after every layout pass */
  const bounds = useRef<{ min: number; max: number }>({ min: 0, max: 0 });
    /* first-gesture flag for background music  */
  const hasPlayedBackground = useRef(false);
  /* removed duplicate clamp/same – we already import the shared helpers */
  /* remember the last rows value */
  const prevRows = useRef<1 | 2 >(rows);
  // track which mesh is currently centred so we know when to “click”-advance
  const currentCenterIdx = useRef<number | null>(null);

  /* ────────────────────────────────────────────────────────────
   * attachOutline — build four beveled corner-brackets and
   * parent them to `mesh` so they automatically track scale /
   * rotation.  Size is uniform across every cover.
   * ──────────────────────────────────────────────────────────── */
  const attachOutline = (
    mesh: THREE.Mesh,
    boxW: number,
    boxH: number,
    boxD: number,
    colour = 0xffc14d,
  ) => {
    if (mesh.userData.outline) return;

    const group = new THREE.Group();
    // Use the new scale constant to control bracket arm length
    const len = Math.min(boxW, boxH) * SELECTOR_SCALE;
    const thick = len * 0.30;
    const cornerRadius = thick;

    const lShape = new THREE.Shape();
    lShape.moveTo(0, len);
    lShape.lineTo(0, cornerRadius);
    lShape.quadraticCurveTo(0, 0, cornerRadius, 0);
    lShape.lineTo(len, 0);
    lShape.lineTo(len, thick);
    lShape.lineTo(cornerRadius, thick);
    lShape.quadraticCurveTo(thick, thick, thick, cornerRadius);
    lShape.lineTo(thick, len);
    lShape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: boxD * 0.02,
      bevelEnabled: false,
    };

    const cornerGeo = new THREE.ExtrudeGeometry(lShape, extrudeSettings);
    const mat = new THREE.MeshBasicMaterial({
      color: colour,
      depthTest: false,
    });

    // This will store data for our new animation logic
    group.userData.corners = [];

    // Calculate the padded position to frame the cover
    const halfW = boxW / 2;
    const halfH = boxH / 2;
    // The total offset from the box edge to the selector's outer corner
    const padding = SELECTOR_PADDING + thick;

    const addCorner = (x: number, y: number, rotation: number) => {
      const corner = new THREE.Mesh(cornerGeo, mat);
      corner.position.set(x, y, 0);
      corner.rotation.z = rotation;
      corner.renderOrder = 1;
      group.add(corner);
      // Store the mesh and its base position for the animation loop
      group.userData.corners.push({
        mesh: corner,
        basePosition: corner.position.clone(),
      });
    };

    // Position corners with the new padding
    addCorner(-halfW - padding, -halfH - padding, 0);
    addCorner( halfW + padding, -halfH - padding, Math.PI / 2);
    addCorner( halfW + padding,  halfH + padding, Math.PI);
    addCorner(-halfW - padding,  halfH + padding, Math.PI * 1.5);

    group.visible = false;
    shelf.current.add(group);
    mesh.userData.outline = group;
  };
  /* ── guarantee an initial selection once meshes exist ── */
  useLayoutEffect(() => {
    if (!selectedRef.current && meshes.current.length) {
      const firstPlayable = meshes.current.find(m => !m.userData.isAdd);
      if (firstPlayable) selectMesh(firstPlayable, false);
    }
  }, []);   // run once

  /** ----------------------------------------------------------
   *  Helpers
   * --------------------------------------------------------- */
  const selectMesh = (
    mesh: THREE.Mesh | null,
    playSelectSound = false,
  ) => {
    // clear old
    if (selectedRef.current) {
      const idleScale = LAYOUT[rows].scale;
      selectedRef.current.scale.set(idleScale, idleScale, idleScale);
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
    const selectedScale = LAYOUT[rows].scale * 1.05; // subtle pop
    mesh.scale.set(selectedScale, selectedScale, selectedScale);
    const outline = mesh.userData.outline as THREE.Object3D;
    if (outline) outline.visible = true;

    // --- THIS IS THE CORRECTED SECTION ---
    // Set the target X position. The animation will be handled by the render loop.
    const targetX = -mesh.position.x;
    shelfTargetX.current = clamp(targetX, bounds.current.min, bounds.current.max);

    // notify
    currentCenterIdx.current = meshes.current.indexOf(mesh);
    onSelect?.(currentCenterIdx.current);
    if (playSelectSound) SoundManager.playObjectSelect();
  };
     

  const _BASE_W = FRONT_3DS * (frontWidthUnits / FRONT_3DS);
  const _BASE_D = SPINE_3DS * (frontWidthUnits / FRONT_3DS);

  const BOX_W = _BASE_W * WIDTH_FACTOR;
  const BOX_D = _BASE_D * DEPTH_FACTOR;
  const BOX_H = BOX_W  * PANEL_RATIO;

  /* base hover – row-scale is applied in the render-loop */
  const HOVER_BASE = BOX_H * 0.02;

  /* --- NEW SELECTOR CONTROLS --- */
  // Use these to get the exact size and behavior you want.
  const SELECTOR_SCALE = 0.22;   // Overall size of the brackets (0.22 = 22% of the cover's smallest dimension)
  const SELECTOR_PADDING = 0.05; // Gap between the game cover and the brackets' inner edge
  const BREATHE_DISTANCE = 0.04; // How far the brackets move during the animation
  const PAN_DAMPING = 0.01; // <-- Controls animation speed. Lower is slower/smoother

  const { startHold, stopHold, attach } = useShelfControls({
    container,
    camera,
    scene,
    shelf,
    meshes,
    selectedRef,
    shellDiv,
    pxPerWorld,
    revealWorld,
    bounds,
    currentCenterIdx,
    rows,
    selectMesh,
    onSelect,
    onLongPress,
    hasPlayedBackground,
    layoutInfo, // <-- ADD THIS LINE
  });

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

    const cleanupControls = attach();

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

      /* ——— NEW position-based breathing animation ——— */
      if (selectedRef.current && selectedRef.current.userData.outline) {
        const g = selectedRef.current.userData.outline as THREE.Group;
        // Calculate a smoothly oscillating value between -1 and 1
        const pulse = Math.sin(t * 4.8);
        const distance = pulse * BREATHE_DISTANCE;

        if (g.userData.corners) {
          // Animate each corner individually
          g.userData.corners.forEach((cornerData: any) => {
            const { mesh, basePosition } = cornerData;
            // Get the direction vector from the center towards the corner
            const direction = basePosition.clone().normalize();
            // Move the corner along that vector
            mesh.position.copy(basePosition).addScaledVector(direction, distance);
          });
        }
      }

      // --- Smooth panning animation ---
      if (shelf.current) {
        const currentX = shelf.current.position.x;
        const targetX = shelfTargetX.current;
        const diff = targetX - currentX;
        if (Math.abs(diff) > 0.001) {
          shelf.current.position.x += diff * PAN_DAMPING;
        } else {
          shelf.current.position.x = targetX;
        }
        if (shellDiv.current) {
          shellDiv.current.style.transform = `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;
        }
      }
      renderer.current.render(scene.current, camera.current);
    };
    renderLoop();

    return () => {
      document.body.style.overflow       = '';
      document.documentElement.style.overflow = '';
      document.body.style.userSelect = '';
      stopAnimation = true;
      window.removeEventListener('resize', resize);
      cleanupControls();
      renderer.current.dispose();
    };
  }, []); // ← run only once on mount
  /* 5. TEXTURE LOADING + MESH UPDATE (runs whenever textures **or rows** change) */
  useEffect(() => {
    if (!renderer.current) return;

    /* ----------------------------------------------------------- *
     * If the only entry left is the ADD_MARKER, remove any         *
     * previous selection and reset that cube’s transform.          *
     * ----------------------------------------------------------- */
    const onlyAdd =
      textures.length === 1 && textures[0] === ADD_MARKER;
    if (onlyAdd) {
      // wipe selection so the “+” isn’t enlarged/rotated
      selectMesh(null, false);
      if (meshes.current[0]) {
        const plus = meshes.current[0];
        plus.rotation.set(0, 0, 0);
        const idle = LAYOUT[rows].scale;
        plus.scale.set(idle, idle, idle);
      }
    }

    const texturesChanged = !same(urls.current, textures);
    const rowSwitch       = prevRows.current !== rows;
    if (!texturesChanged && !rowSwitch) return;   // nothing to do

    if (texturesChanged) urls.current = textures.slice();
    prevRows.current = rows;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

  
    /* ------------------------------------------------------------------ *
     * Some covers 404 on the very first request because the upload is
     * still being flushed to disk.  Wrap TextureLoader in a tiny retry
     * helper so the material can recover instead of staying grey.
     * ------------------------------------------------------------------ */
     /* helper: deep-dispose single or array materials */
     const disposeMaterial = (mat: any) => {
       if (Array.isArray(mat)) mat.forEach(m => m?.dispose?.());
       else mat?.dispose?.();
     };

     const loadWithRetry = (
      url: string,
      mesh: THREE.Mesh,
      tries = 0,
      maxTries = 3,
      delay = 400        /* ms */
    ) => {
      loader.load(
        url,
        tex => {
          mesh.material = buildMats3DS(tex, renderer.current);
          mesh.userData.url = url;
        },
        undefined,
        () => {
          if (tries < maxTries) {
            setTimeout(() => loadWithRetry(url, mesh, tries + 1), delay);
          } else {
            mesh.material = new THREE.MeshBasicMaterial({ color: 0x555555 });
            mesh.userData.url = url;
          }
        },
      );
    };

    textures.forEach((url, i) => {
      /* 5a. Compute box dims (3DS-only) */
      const scaleW = frontWidthUnits / FRONT_3DS;
      const scaleH = frontHeightUnits / (FULL_H_3DS * HEIGHT_RATIO_3DS);
      const scale  = Math.min(scaleW, scaleH);
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
      const wasAdd = mesh ? !!mesh.userData.isAdd : isAdd;

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
          /* draw frame 10 % inside the edge (uniform for all covers) */
          attachOutline(mesh, boxW * 1.0, boxH * 1.0, boxD);
          // --- ADD THESE TWO LINES ---
          mesh.userData.outlineBuiltForW = boxW;
          mesh.userData.outlineBuiltForH = boxH;
        }
      }

      // If the role changed (e.g., "+" to cover), swap the geometry to match
      if (wasAdd !== isAdd) {
        mesh.geometry.dispose();
        mesh.geometry = isAdd
          ? new RoundedBoxGeometry(boxW * 0.8, boxW * 0.8, boxD * 0.1, 8, bevelRadius)
          : new RoundedBoxGeometry(boxW, boxH, boxD, 16, bevelRadius);
        mesh.userData.isAdd = isAdd;
        /* “+” → real cover */
        if (wasAdd && !isAdd) {
          disposeMaterial(mesh.material);                
          mesh.material = new THREE.MeshBasicMaterial({  // temp grey
            color: 0x444444,
          });
          loadWithRetry(url, mesh);
          /* keep identical inset when a “+” cube becomes a real cover */
          attachOutline(mesh, boxW, boxH, boxD);
          mesh.userData.outlineBuiltForW = boxW;
          mesh.userData.outlineBuiltForH = boxH;
          mesh.userData.outline.visible = true;
          selectMesh(mesh, false);
        }
        /* real → add  ➜  remove old brackets */
        if (!wasAdd && isAdd) {
          if (mesh.userData.outline) {
            shelf.current.remove(mesh.userData.outline);
            mesh.userData.outline.traverse((o: any) => {
              o.material?.dispose?.();
              o.geometry?.dispose?.();
            });
            delete mesh.userData.outline;
          }
        }
        /* when converting from an “add” cube, build missing brackets only */
        if (wasAdd && !isAdd) {
          const sw = boxW * 1.6, sh = boxH * 1.6;
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
        }
      } else {
        // This block handles existing meshes that are NOT changing type.
        // We check if their outline is now the wrong size and rebuild it if so.
        if (!isAdd && mesh.userData.outline) {
          const outlineNeedsRebuild =
            mesh.userData.outlineBuiltForW !== boxW ||
            mesh.userData.outlineBuiltForH !== boxH;

          if (outlineNeedsRebuild) {
            // Remove the old, incorrectly-sized outline
            const oldOutline = mesh.userData.outline;
            shelf.current.remove(oldOutline);
            oldOutline.traverse((o: any) => {
              o.geometry?.dispose();
              o.material?.dispose();
            });
            // Attach a new one with the correct dimensions
            attachOutline(mesh, boxW, boxH, boxD);
            mesh.userData.outlineBuiltForW = boxW;
            mesh.userData.outlineBuiltForH = boxH;
          }
        }
      }

      // Now mesh points to our box; next we’ll update its material (if needed),
      // and position both box and its shadow in the layout.
      mesh = meshes.current[i];
      // Remove duplicate declaration of wasAdd
      // const wasAdd = !!mesh.userData.isAdd;   // save previous role
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

             
          /* ─── NEW ───
           * a former “+” cube is now a real cover:
           *  • give it a temporary material so it isn't invisible
           *  • make it the current selection immediately
           */
         /* “+” → real cover */
         if (wasAdd && !isAdd) {
           disposeMaterial(mesh.material);                
           mesh.material = new THREE.MeshBasicMaterial({  // temp grey
             color: 0x444444,
           });
           loadWithRetry(url, mesh);
           /* keep identical inset when a “+” cube becomes a real cover */
           attachOutline(mesh, boxW, boxH, boxD);
           mesh.userData.outlineBuiltForW = boxW;
           mesh.userData.outlineBuiltForH = boxH;
           mesh.userData.outline.visible = true;
           selectMesh(mesh, false);
         }
           /* real → add  ➜  remove old brackets */
           if (!wasAdd && isAdd) {
             if (mesh.userData.outline) {
               shelf.current.remove(mesh.userData.outline);
               mesh.userData.outline.traverse((o: any) => {
                 o.material?.dispose?.();
                 o.geometry?.dispose?.();
              });
              delete mesh.userData.outline;
            }
          }

            
           /* when converting from an “add” cube, build missing brackets only */
           if (wasAdd && !isAdd) {
             const sw = boxW * 1.6, sh = boxH * 1.6;
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
        }
        mesh.userData.url = url;
         } else if (url === ADD_MARKER) {
           /* real cover → “+” cube */
           mesh.userData.isAdd = true;
           disposeMaterial(mesh.material);                // 🔑 nuke old art
           const invisible = new THREE.MeshBasicMaterial({
             transparent: true,
             opacity: 0,
           });
          mesh.material = Array(6).fill(invisible);

          if (!mesh.userData.plusBuilt) {
            const barT = boxW * 0.10; // thickness
            const barL = boxW * 0.46; // length
            const barD = boxD * 0.35;
            const r    = barT * 0.9;  // bevel
            const barGeoH = new RoundedBoxGeometry(barL, barT, barD, 6, r);
            const barGeoV = new RoundedBoxGeometry(barT, barL, barD, 6, r);
            const barMat  = new THREE.MeshBasicMaterial({ color: 0xffbe32 });
            const barH = new THREE.Mesh(barGeoH, barMat);
            const barV = new THREE.Mesh(barGeoV, barMat);
            const plusGrp = new THREE.Group();
            plusGrp.userData.isPlus = true;
            plusGrp.add(barH);
            plusGrp.add(barV);
            barH.position.z = barV.position.z = boxD * 0.55;
            mesh.add(plusGrp);
            mesh.userData.plusBuilt = true;
          }
          mesh.userData.url = url;
        } else if (mesh.userData.url !== url) {
          loadWithRetry(url, mesh);
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
  // NEW – also purge the helper objects we attached to the shelf
  ['outline'].forEach(key => {
    const obj = m.userData[key];
    if (obj) {
      shelf.current.remove(obj);
      obj.traverse((o: THREE.Object3D) => {
        (o as any).geometry?.dispose?.();
        (o as any).material?.dispose?.();
      });
    }
  });
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
    layoutInfo.current.cols = cols;
    const rowW   = cols * itemW + (cols - 1) * gapX + padLeft + padRight;  // world units
    const gridH  = rows * itemH + (rows - 1) * gapY + padTop + padBottom;
    all.forEach((m, i) => {
      // Reset scale to idle for all meshes
      const idleScale = LAYOUT[rows].scale;
      m.scale.set(idleScale, idleScale, idleScale);

      const r = Math.floor(i / cols);        // row 0…rows-1
      const c = i % cols;                    // col 0…cols-1

      const xOffset = (padLeft - padRight) / 2;
      const x = (c - (cols - 1) / 2) * (itemW + gapX) + xOffset;
      const yOffset = (padTop - padBottom) / 2;
      const y = ((rows - 1) / 2 - r) * (itemH + gapY) - yOffset;

      m.position.set(x, y, 0);
      m.userData.homeY = y;
       if (!m.userData.isAdd && m.userData.outline) {
          const zFront = (m.userData.actualDepth as number) / 2 + 0.01;
          m.userData.outline.position.set(x, y, zFront);
          m.userData.outline.visible = selectedRef.current === m;
       }

    });
    /* ------------ update camera Z so every grid fits on screen ----------- */
    camera.current.position.z = BOX_H * (rows === 1 ? 3.6 : 6.8);

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
    const leftPx = (containerW - (rowPx + shellRevealPx * 2)) / 2;
  

    // ─── size & position shell to exactly cover the row ───────
    shellDiv.current!.style.width     = `${rowPx + shellRevealPx * 2}px`;
    shellDiv.current!.style.left      = `${leftPx}px`;
    shellDiv.current!.style.transform = '';  // clear previous translateX
        // slide shell in sync with ThreeJS pan
    shellDiv.current!.style.transform =
      `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;
    /* keep selection centred after row-switch */
    if (selectedRef.current) {
      // Set the target to the currently selected item's new position
      const targetX = -selectedRef.current.position.x;
      shelfTargetX.current = clamp(targetX, bounds.current.min, bounds.current.max);
    } else {
      // If there's no selection, just ensure the current target is within the new bounds
      shelfTargetX.current = clamp(
        shelfTargetX.current,
        bounds.current.min,
        bounds.current.max
      );
    }
    /* Ensure there's always an initial selection – pick the first REAL cover */
    if (!selectedRef.current) {
      const firstReal = meshes.current.find(m => !m.userData.isAdd);
      if (firstReal) selectMesh(firstReal, false);
    }
    // ----------------------------------------------------------------
    // ++ sync CSS shell after layout
    // shellDiv.current!.style.transform =
    //   `translateX(${shelf.current.position.x * pxPerWorld.current}px)`;
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
      <div ref={shellDiv} style={shellStyle(theme)} />
      <div
        className="shelf-arrow left"
        data-ui="true" // <-- ADD THIS ATTRIBUTE
        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
          const el = e.currentTarget as HTMLElement;
          el.classList.add('bounce');
        }}
        onAnimationEnd={(e: React.AnimationEvent<HTMLDivElement>) => {
          const el = e.currentTarget as HTMLElement;
          el.classList.remove('bounce');
        }}
        onMouseDown={() => startHold({ x: -1, y: 0 })} // FIXED
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
      />
      <div
        className="shelf-arrow right"
        data-ui="true" // <-- AND ADD IT HERE
        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
          const el = e.currentTarget as HTMLElement;
          el.classList.add('bounce');
        }}
        onAnimationEnd={(e: React.AnimationEvent<HTMLDivElement>) => {
          const el = e.currentTarget as HTMLElement;
          el.classList.remove('bounce');
        }}
        onMouseDown={() => startHold({ x: 1, y: 0 })} // FIXED
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
      />
    </div>
  );
};
export default GameShelf;