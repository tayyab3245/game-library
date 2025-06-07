// src/components/GameShelf.tsx

import React, { useEffect, useRef } from 'react';
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
}


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
  frontWidthUnits = 8,
  frontHeightUnits = 8,
  onSelect,
  onLongPress, 
}) => {


  const container = useRef<HTMLDivElement>(null);
  const renderer  = useRef<THREE.WebGLRenderer>(null!);
  const scene     = useRef<THREE.Scene>(null!);
  const camera    = useRef<THREE.PerspectiveCamera>(null!);
  const shelf     = useRef<THREE.Group>(null!);
  const meshes    = useRef<THREE.Mesh[]>([]);
  const urls      = useRef<string[]>([]);
  const selected  = useRef<THREE.Mesh | null>(null);
  /** scale used for every active cover (manual or auto) */
  const SELECT_SCALE = 1.35;
  /** shelf X-bounds after every layout pass */
  const bounds = useRef<{ min: number; max: number }>({ min: 0, max: 0 });

  const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;


  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);


  const hasPlayedBackground = useRef(false);

  // track which mesh is currently centred so we know when to “click”-advance
  const currentCenterIdx = useRef<number | null>(null);

  /** ----------------------------------------------------------
   *  Helpers
   * --------------------------------------------------------- */
  const selectMesh = (
    mesh: THREE.Mesh | null,
    playSelectSound = false,
  ) => {
    // clear old
    if (selected.current) {
      selected.current.scale.set(1, 1, 1);
      selected.current.rotation.y = 0;
      const prevOutline = selected.current.userData.outline as THREE.Object3D;
      if (prevOutline) prevOutline.visible = false;
    }

    selected.current = mesh;
    if (!mesh) {
      onSelect?.(null);
      return;
    }

    // mark new
    mesh.scale.set(SELECT_SCALE, SELECT_SCALE, SELECT_SCALE);
    const outline = mesh.userData.outline as THREE.Object3D;
    if (outline) outline.visible = true;

    // slide shelf so this mesh is centred (world-X === 0)
    const worldX = mesh.position.x + shelf.current.position.x;
    shelf.current.position.x -= worldX;

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

  const GAP   = BOX_W * 0.25;
  const HOVER = BOX_H * 0.03;

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
        const d = Math.abs(m.position.x + shelf.current.position.x);
        if (d < min) {
          min = d;
          nearest = m;
        }
      });
      if (nearest && nearest !== selected.current) selectMesh(nearest, false);
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

      const hit = ray.intersectObjects<THREE.Mesh>(meshes.current, true)[0]
            ?.object;

      if (hit) {
        if (selected.current !== hit) selectMesh(hit, true);
        mode = 'rotate';

        longTid = window.setTimeout(() => {
          longTid = null;
          if (!moved) onLongPress?.(meshes.current.indexOf(hit));
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

      if (mode === 'rotate' && selected.current) {
        selected.current.rotation.y += dx * 0.012;
      } else if (mode === 'pan') {
        // move shelf
        shelf.current.position.x = clamp(
          shelf.current.position.x + dx * 0.015,
          bounds.current.min,
          bounds.current.max,
        );

        // check centre change
        let nearest = -1,
          nearestDist = Infinity;
        meshes.current.forEach((m, idx) => {
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
      if (mode === 'pan') autoSelectCentered();
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
        m.position.y = (m.userData.homeY || 0) + Math.sin(t * 1.2 + ph) * HOVER;
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
  const holdTid = useRef<number | null>(null);
  const STEP = () => {
    if (currentCenterIdx.current === null) return;
    const next = clamp(
      currentCenterIdx.current + (holdTid.current === -1 ? -1 : 1),
      0,
      meshes.current.length - 1,
    );
    if (next !== currentCenterIdx.current) selectMesh(meshes.current[next], true);
  };
  const startHold = (dir: -1 | 1) => {
    holdTid.current = dir;           // save direction in ref
    STEP();
    holdTid.current = window.setInterval(STEP, 260) as unknown as number;
  };
  const stopHold = () => {
    if (holdTid.current !== null) {
      clearInterval(holdTid.current);
      holdTid.current = null;
    }
  };

  /* 5. TEXTURE LOADING + MESH UPDATE (runs whenever `textures` actually changes) */
  useEffect(() => {
    if (!renderer.current) return;
    if (same(urls.current, textures)) return;
    urls.current = textures.slice();

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    textures.forEach((url, i) => {
      /* 5a. Compute box dims (3DS-only) */
      const scaleW = frontWidthUnits / FRONT_3DS;
      const scaleH = frontHeightUnits / (FULL_H_3DS * HEIGHT_RATIO_3DS);
      const scale  = Math.min(scaleW, scaleH);

      const boxW = FRONT_3DS * scale * WIDTH_FACTOR;   // new width
      const boxH = boxW * PANEL_RATIO;                 // derived height
      const boxD = SPINE_3DS * scale * DEPTH_FACTOR;   // thinner spine

      /* 5b. Create or reuse mesh */
      let mesh = meshes.current[i];
        if (!mesh) {
          // 1) Create the box itself
          // use RoundedBoxGeometry for beveled edges
          const bevelRadius = Math.min(boxW, boxH) * 0.02; // game container edge bevel
          const geo = new RoundedBoxGeometry(boxW, boxH, boxD, 16, bevelRadius);
          mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));

          mesh.userData.ph = Math.random() * Math.PI * 2;
          shelf.current.add(mesh);
          meshes.current[i] = mesh;

          // spacing: leave padding around each object
          mesh.userData.padding = bevelRadius * 2;
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
        }

        // Now mesh points to our box; next we’ll update its material (if needed),
        // and position both box and its shadow in the layout.
        mesh = meshes.current[i];


      /* 5c. Load texture if URL changed */
      if (mesh.userData.url !== url) {
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

      /* 5d. Store dims for layout */
      mesh.userData.actualWidth  = boxW;
      mesh.userData.actualHeight = boxH;
      mesh.userData.actualDepth  = boxD;
    });

    // Remove any extra meshes
    while (meshes.current.length > textures.length) {
      const m = meshes.current.pop()!;
      shelf.current.remove(m);
      (m.material as any).dispose?.();
      m.geometry.dispose();
    }

    // Layout: center row with gaps
    const all = meshes.current;
    const totalWidth =
      all.reduce((sum, m) => {
        const w = (m.userData.actualWidth as number) || frontWidthUnits;
        const pad = (m.userData.padding as number) || 0;
        return sum + w + pad;
      }, 0) + Math.max(0, all.length - 1) * (GAP + (all[0]?.userData.padding || 0));

    let cursor = -totalWidth / 2;
      all.forEach((m) => {
          const w = (m.userData.actualWidth as number) || frontWidthUnits;
          const pad = (m.userData.padding as number) || 0;
          const half = (w + pad) / 2;
          const boxH = (m.userData.actualHeight as number);
          const boxD = (m.userData.actualDepth as number);
          // Position box on “ground” (y=0)
          m.position.set(cursor + half, 0, 0);
          m.userData.homeY = 0;
          // Position vertical shadow “wall” behind box
          const shadow = m.userData.shadow as THREE.Mesh;
          // Place shadow at height equal to box center, behind box along -Z
          shadow.position.set(cursor + half, 0, -boxD / 2 - 0.1 );
          // match bracket position/rotation to shadow
          const outline = m.userData.outline as THREE.Object3D;
          outline.position.copy(shadow.position);
          // ensure outline rotation matches shadow orientation
          outline.rotation.copy(shadow.rotation);
          outline.visible = selected.current === m;
          cursor += w + pad + GAP + 2.5 ;  // space between each game object + container
    });

    
    /* ---------- compute pan limits (first & last cover centred) ---------- */
    if (all.length) {
      const firstCenter = all[0].position.x;
      const lastCenter  = all[all.length - 1].position.x;
      bounds.current.min = -lastCenter;
      bounds.current.max = -firstCenter;
      shelf.current.position.x = clamp(shelf.current.position.x, bounds.current.min, bounds.current.max);
    }

  }, [textures, frontWidthUnits, frontHeightUnits]);


  /* 6. Render container div */
  return (
    <div
      ref={container}
      style={{ width, height, position: 'relative', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
    >
      {/* ← arrow */}
      <div
        onMouseDown={() => startHold(-1)}
        onMouseUp={stopHold}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 70,
          height: 120,
          borderTopRightRadius: 60,
          borderBottomRightRadius: 60,
          background: '#ffbe32',
          boxShadow: '0 4px 12px rgba(0,0,0,.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)')}
        onMouseLeave={e => {
          stopHold();
          e.currentTarget.style.transform = 'translateY(-50%)';
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
          width: 70,
          height: 120,
          borderTopLeftRadius: 60,
          borderBottomLeftRadius: 60,
          background: '#ffbe32',
          boxShadow: '0 4px 12px rgba(0,0,0,.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)')}
        onMouseLeave={e => {
          stopHold();
          e.currentTarget.style.transform = 'translateY(-50%)';
        }}
      >
        &#9654;
      </div>
    </div>
  );
};

export default GameShelf;
