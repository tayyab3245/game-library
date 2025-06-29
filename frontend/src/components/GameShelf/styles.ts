// src/components/GameShelf/styles.ts
import { Theme } from '../../theme';

export const shellStyle = (t: Theme): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: '32px',          // even closer to CommandBar
  borderRadius: 40,
  // stronger plastic-panel gradient
  background: `linear-gradient(180deg, ${t.panelTop} 0%, ${t.panelBot} 95%)`,
  pointerEvents: 'none',
  zIndex: -1,

  //  ───────── lift off the page ─────────
  boxShadow:
    t.mode === 'light'
      // inset highlight + drop-shadow for light mode
      ? 'inset 0 4px 6px rgba(255,255,255,0.6), 0 8px 16px rgba(0,0,0,0.1)'
      // keep existing dark-mode shadow
      : t.shadow,

  // beef up the bottom rim “lip”
  borderBottom: `6px solid ${t.panelEdge}`,
  transition: 'transform 0.25s ease-out',
});

export const getArrowCSS = (t: Theme) => `
  /* ─── bounce keyframes ─── */
  @keyframes arrowBounce {
    0%   { transform: translateY(-50%) scale(1); }
    30%  { transform: translateY(-50%) scale(1.2); }
    50%  { transform: translateY(-50%) scale(0.9); }
    70%  { transform: translateY(-50%) scale(1.05); }
    100% { transform: translateY(-50%) scale(1); }
  }

  /* ——— circular arrow button ——— */
  .shelf-arrow {
    position: absolute;
    top: 60%;
    transform: translateY(-50%);
    width: 72px;
    height: 72px;
    border-radius: 50%;
    cursor: pointer;
    overflow: hidden;
    z-index: 10;
    background:
      linear-gradient(-35deg, rgba(255,255,255,0.07) 0%, transparent 60%),
      linear-gradient(180deg, ${t.panelTop} 0%, ${t.panelBot} 100%);
    /* apply same elevated style as shell */
    box-shadow:
      ${t.mode === 'light'
        ? 'inset 0 4px 6px rgba(255,255,255,0.6), 0 8px 16px rgba(0,0,0,0.1)'
        : 'inset 0 2px 3px rgba(255,255,255,0.08), inset 0 -1px 2px rgba(0,0,0,0.40), 0 6px 12px rgba(0,0,0,0.30)'};
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(1.5px);
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    outline: none;
    animation-fill-mode: forwards;
  }

  /* no hover effect – Nintendo UI stays calm */
  .shelf-arrow:hover { }

  /* pressing or keyboard‐focus triggers full bounce */
  .shelf-arrow.bounce {
    animation: arrowBounce 0.4s ease-out forwards;
    box-shadow:
      inset 0 1px 2px rgba(255,255,255,0.15),
      inset 0 -1px 2px rgba(0,0,0,0.45),
      0 2px 4px rgba(0,0,0,0.25);
  }

  /* ——— rounded chevron: two bars ——— */
  .shelf-arrow::before,
  .shelf-arrow::after {
    content: '';
    position: absolute;
    top: 45%;
    left: 40%;
    width: 8px;            /* thickness */
    height: 26px;          /* arm length */
    background: ${t.text};
    border-radius: 4px;
    transform-origin: 0 50%;   /* pivot from left-middle */
  }

  /* RIGHT “>” */
  .shelf-arrow.right::before {
    transform: translate(3px, -15%) rotate(45deg);
  }
  .shelf-arrow.right::after {
    transform: translate(3px, -50%) rotate(-45deg);
  }

  /* LEFT “<” */
  .shelf-arrow.left::before {
    transform: translate(7px, -15%) rotate(135deg);
  }
  .shelf-arrow.left::after {
    transform: translate(7px, -50%) rotate(-135deg);
  }

  /* placement */
  .shelf-arrow.left  { left: 24px; }
  .shelf-arrow.right { right: 24px; }
`;
