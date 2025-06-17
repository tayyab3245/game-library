export const shellStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: '16px', // move bottom edge upward
  borderRadius: 40,
  background: 'linear-gradient(180deg, color-mix(in srgb,var(--panel) 20%,white) 0%, var(--panel) 100%)',
  boxShadow: '0 0.6em 1em rgba(0,0,0,.55)',
  borderBottom: '6px solid color-mix(in srgb,var(--panel) 60%,black)',
  transition: 'transform 0.3s ease-out',
  pointerEvents: 'none',
  zIndex: -1,
};

export const getArrowCSS = () => `
  .shelf-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 72px;
    height: 72px;
    background:
      linear-gradient(-35deg, rgba(255,255,255,0.07) 0%, transparent 60%),
      linear-gradient(180deg, color-mix(in srgb,var(--panel) 10%,white) 0%, var(--panel) 100%);
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
    border-color: transparent var(--text) transparent transparent;
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
      linear-gradient(180deg, color-mix(in srgb,var(--panel) 25%,white) 0%, color-mix(in srgb,var(--panel) 80%,black) 100%);
    box-shadow:
      inset 0 2px 3px rgba(255,255,255,0.1),
      inset 0 -1px 2px rgba(0,0,0,0.5),
      0 6px 14px rgba(0,0,0,0.4),
      0 0 6px rgba(170, 230, 255, 0.3);
    filter: brightness(1.1);
  }
`;