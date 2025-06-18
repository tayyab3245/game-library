/* 3DS-style chunky gradient button – matches CommandBar colours */
import { Theme } from '../theme';

export const neonBtn = (disabled: boolean, t: Theme): React.CSSProperties => ({
  padding: '12px 28px',
  fontWeight: 700,
  fontSize: 16,
  textTransform: 'uppercase',
  letterSpacing: '.3px',
  color: t.text,
  border: 'none',
  borderRadius: 14,
  cursor: disabled ? 'default' : 'pointer',
  /* pick up the --panel token so it flips with the theme */
  background:
    'linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%),' +
    `linear-gradient(180deg,${t.surface} 0%,color-mix(in srgb,${t.surface} 30%,black) 100%)`,
  backgroundBlendMode: 'soft-light',
  boxShadow: disabled
    ? 'none'
    : t.embossed,
  filter: disabled ? 'grayscale(1) opacity(.4)' : undefined,
  transition: 'filter .12s, transform .12s',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
});

export const globalStyles = (t: Theme) => ({
  background: t.background,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  color: t.text,
  /* …rest unchanged … */
});