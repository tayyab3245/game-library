import { Theme } from '../../theme';

export const shellStyle = (t: Theme): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: '96px',          // leave breathing-room above CommandBar
  borderRadius: 40,
  background: `linear-gradient(180deg,${t.panelTop} 0%,${t.panelBot} 100%)`,
  boxShadow: t.shadow,
  borderBottom: `6px solid ${t.panelEdge}`,
  transition: 'transform 0.25s ease-out',  /* keep in sync with TIMINGS.snap */
  pointerEvents: 'none',
  zIndex: -1,
});

export const getArrowCSS = (t: Theme) => `
  .shelf-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 72px;
    height: 72px;
    background:
       linear-gradient(-35deg, rgba(255,255,255,0.07) 0%, transparent 60%),
       linear-gradient(180deg,${t.panelTop} 0%,${t.panelBot} 100%);
    box-shadow:
      inset 0 2px 3px rgba(255,255,255,0.08),
      inset 0 -1px 2px rgba(0,0,0,0.4),
      0 6px 12px rgba(0,0,0,0.3),
      0 0 4px rgba(140, 210, 255, 0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
    z-index: 10;
    overflow: hidden;
    backdrop-filter: blur(1.5px);
  }
  .shelf-arrow::before {
    content: '';
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 12px 18px 12px 0;
    border-color: transparent ${t.text} transparent transparent;
    filter:
      drop-shadow(0 0 1px rgba(255, 255, 255, 0.4))
      drop-shadow(0 0 4px rgba(255, 255, 255, 0.2));
    transform: translateX(2px);
  }
  .shelf-arrow.right::before {
    transform: translateX(-2px) rotate(180deg);
  }
  .shelf-arrow.left {
    left: 24px;
  }
  .shelf-arrow.right {
    right: 24px;
  }
  .shelf-arrow:hover {
    transform: translateY(-50%) scale(1.05);
    background:
       linear-gradient(-35deg, rgba(255,255,255,0.12) 0%, transparent 60%),
       linear-gradient(180deg,${t.panelTop} 0%,color-mix(in srgb,${t.panelBot} 80%,black) 100%);
    box-shadow:
      inset 0 2px 3px rgba(255,255,255,0.1),
      inset 0 -1px 2px rgba(0,0,0,0.5),
      0 6px 14px rgba(0,0,0,0.4),
      0 0 6px rgba(170, 230, 255, 0.3);
    filter: brightness(1.1);
  }
`;